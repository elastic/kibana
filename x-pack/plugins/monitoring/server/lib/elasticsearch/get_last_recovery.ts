/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import _ from 'lodash';
// @ts-ignore
import { checkParam } from '../error_missing_required';
// @ts-ignore
import { createQuery } from '../create_query';
// @ts-ignore
import { ElasticsearchMetric } from '../metrics';
import {
  ElasticsearchResponse,
  ElasticsearchIndexRecoveryShard,
  ElasticsearchResponseHit,
} from '../../../common/types/es';
import { LegacyRequest } from '../../types';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { Globals } from '../../static_globals';

/**
 * Filter out shard activity that we do not care about.
 *
 * The shard activity gets returned as a big document with a lot of shard activity reported that is out of date with respect
 * to the date range of the polling window. We only care about any shard activity that isn't finished yet, or that ended
 * after the polling window (it's implied that the activity is relevant for the _end_ time because the document wouldn't
 * have been returned otherwise).
 *
 * @param {Number} startMs Start time in milliseconds of the polling window
 * @returns {boolean} true to keep
 */
export function filterOldShardActivity(startMs: number) {
  return (activity?: ElasticsearchIndexRecoveryShard) => {
    // either it's still going and there is no stop time, or the stop time happened after we started looking for one
    return (
      activity &&
      (!_.isNumber(activity.stop_time_in_millis) || activity.stop_time_in_millis >= startMs)
    );
  };
}

/**
 * The response handler for {@link getLastRecovery}.
 *
 * This is exposed for testing.
 * @param {Object} resp The response returned from the search request
 * @param {Date} start The start time from the request payload (expected to be of type {@code Date})
 * @returns {Object[]} An array of shards representing active shard activity from {@code _source.index_recovery.shards}.
 */
export function handleLegacyLastRecoveries(resp: ElasticsearchResponse, start: number) {
  if (resp.hits?.hits.length === 1) {
    const data = (resp.hits?.hits[0]?._source.index_recovery?.shards ?? []).filter(
      filterOldShardActivity(moment.utc(start).valueOf())
    );
    data.sort((a, b) => (b.start_time_in_millis ?? 0) - (a.start_time_in_millis ?? 0));
    return data;
  }

  return [];
}

// For MB, we index individual documents instead of a single document with a list of recovered shards
// This means we need to query a bit differently to end up with the same result. We need to ensure
// that our recovered shards are within the same time window to match the legacy query (of size: 1)
export function handleMbLastRecoveries(resp: ElasticsearchResponse, start: number) {
  const hits = resp.hits?.hits ?? [];
  const groupedByTimestamp = hits.reduce(
    (accum: { [timestamp: string]: ElasticsearchResponseHit[] }, hit) => {
      const timestamp = hit._source['@timestamp'] ?? '';
      accum[timestamp] = accum[timestamp] || [];
      accum[timestamp].push(hit);
      return accum;
    },
    {}
  );
  const maxTimestamp = resp.aggregations?.max_timestamp?.value_as_string;
  const mapped = (groupedByTimestamp[maxTimestamp] ?? []).map(
    (hit) => hit._source.elasticsearch?.index?.recovery
  );
  const filtered = mapped.filter(filterOldShardActivity(moment.utc(start).valueOf()));
  filtered.sort((a, b) =>
    a && b ? (b.start_time_in_millis ?? 0) - (a.start_time_in_millis ?? 0) : 0
  );
  return filtered;
}

export async function getLastRecovery(req: LegacyRequest, size: number) {
  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;
  const clusterUuid = req.params.clusterUuid;

  const metric = ElasticsearchMetric.getMetricFields();

  const dataset = 'index_recovery';
  const moduleType = 'elasticsearch';
  const indexPattern = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType,
    dataset,
    ccs: req.payload.ccs,
  });

  const legacyParams = {
    index: indexPattern,
    size: 1,
    ignore_unavailable: true,
    body: {
      _source: ['index_recovery.shards'],
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query: createQuery({
        type: dataset,
        metricset: dataset,
        start,
        end,
        clusterUuid,
        metric,
      }),
    },
  };

  const indexPatternEcs = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType,
    dataset,
    ccs: req.payload.ccs,
    ecsLegacyOnly: true,
  });
  const ecsParams = {
    index: indexPatternEcs,
    size,
    ignore_unavailable: true,
    body: {
      _source: ['elasticsearch.index.recovery', '@timestamp'],
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query: createQuery({
        type: dataset,
        dsDataset: `${moduleType}.${dataset}`,
        metricset: dataset,
        start,
        end,
        clusterUuid,
        metric,
      }),
      aggs: {
        max_timestamp: {
          max: {
            field: '@timestamp',
          },
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const [legacyResp, mbResp] = await Promise.all([
    callWithRequest(req, 'search', legacyParams),
    callWithRequest(req, 'search', ecsParams),
  ]);
  const legacyResult = handleLegacyLastRecoveries(legacyResp, start);
  const mbResult = handleMbLastRecoveries(mbResp, start);

  return [...legacyResult, ...mbResult];
}
