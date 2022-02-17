/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import { checkParam } from '../../error_missing_required';
// @ts-ignore
import { ElasticsearchMetric } from '../../metrics';
// @ts-ignore
import { createQuery } from '../../create_query';
// @ts-ignore
import { calculateRate } from '../../calculate_rate';
// @ts-ignore
import { getUnassignedShards } from '../shards';
import { ElasticsearchResponse } from '../../../../common/types/es';
import { LegacyRequest } from '../../../types';
import { getNewIndexPatterns } from '../../cluster/get_index_patterns';
import { Globals } from '../../../static_globals';

export function handleResponse(
  resp: ElasticsearchResponse,
  min: number,
  max: number,
  shardStats: any
) {
  // map the hits
  const hits = resp?.hits?.hits ?? [];
  return hits.map((hit) => {
    const stats = hit._source.index_stats ?? hit._source.elasticsearch?.index;
    const earliestStats =
      hit.inner_hits?.earliest?.hits?.hits[0]?._source.index_stats ??
      hit.inner_hits?.earliest?.hits?.hits[0]?._source.elasticsearch?.index;

    const rateOptions = {
      hitTimestamp: hit._source.timestamp ?? hit._source['@timestamp'] ?? null,
      earliestHitTimestamp:
        hit.inner_hits?.earliest?.hits?.hits[0]?._source.timestamp ??
        hit.inner_hits?.earliest?.hits?.hits[0]?._source['@timestamp'] ??
        null,
      timeWindowMin: min,
      timeWindowMax: max,
    };

    const earliestIndexingHit = earliestStats?.primaries?.indexing;
    const { rate: indexRate } = calculateRate({
      latestTotal: stats?.primaries?.indexing?.index_total,
      earliestTotal: earliestIndexingHit?.index_total,
      ...rateOptions,
    });

    const earliestSearchHit = earliestStats?.total?.search;
    const { rate: searchRate } = calculateRate({
      latestTotal: stats?.total?.search?.query_total,
      earliestTotal: earliestSearchHit?.query_total,
      ...rateOptions,
    });

    const shardStatsForIndex = get(shardStats, ['indices', stats?.index ?? stats?.name ?? '']);
    let status;
    let statusSort;
    let unassignedShards;
    if (shardStatsForIndex && shardStatsForIndex.status) {
      status = shardStatsForIndex.status;
      unassignedShards = getUnassignedShards(shardStatsForIndex);

      // create a numerical status value for sorting
      if (status === 'green') {
        statusSort = 1;
      } else if (status === 'yellow') {
        statusSort = 2;
      } else {
        statusSort = 3;
      }
    } else {
      status = i18n.translate('xpack.monitoring.es.indices.deletedClosedStatusLabel', {
        defaultMessage: 'Deleted / Closed',
      });
      statusSort = 0;
    }

    return {
      name: stats?.index ?? stats?.name,
      status,
      doc_count: stats?.primaries?.docs?.count,
      data_size: stats?.total?.store?.size_in_bytes,
      index_rate: indexRate,
      search_rate: searchRate,
      unassigned_shards: unassignedShards,
      status_sort: statusSort,
    };
  });
}

export function buildGetIndicesQuery(
  req: LegacyRequest,
  clusterUuid: string,
  {
    start,
    end,
    size,
    showSystemIndices = false,
  }: { start: number; end: number; size: number; showSystemIndices: boolean }
) {
  const filters = [];
  if (!showSystemIndices) {
    filters.push({
      bool: {
        must_not: [{ prefix: { 'index_stats.index': '.' } }],
      },
    });
  }
  const metricFields = ElasticsearchMetric.getMetricFields();
  const dataset = 'index'; // data_stream.dataset
  const type = 'index_stats'; // legacy
  const moduleType = 'elasticsearch';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    dataset,
    moduleType,
  });

  return {
    index: indexPatterns,
    size,
    ignore_unavailable: true,
    filter_path: [
      // only filter path can filter for inner_hits
      'hits.hits._source.index_stats.index',
      'hits.hits._source.elasticsearch.index.name',
      'hits.hits._source.index_stats.primaries.docs.count',
      'hits.hits._source.elasticsearch.index.primaries.docs.count',
      'hits.hits._source.index_stats.total.store.size_in_bytes',
      'hits.hits._source.elasticsearch.index.total.store.size_in_bytes',

      // latest hits for calculating metrics
      'hits.hits._source.timestamp',
      'hits.hits._source.@timestamp',
      'hits.hits._source.index_stats.primaries.indexing.index_total',
      'hits.hits._source.elasticsearch.index.primaries.indexing.index_total',
      'hits.hits._source.index_stats.total.search.query_total',
      'hits.hits._source.elasticsearch.index.total.search.query_total',

      // earliest hits for calculating metrics
      'hits.hits.inner_hits.earliest.hits.hits._source.timestamp',
      'hits.hits.inner_hits.earliest.hits.hits._source.@timestamp',
      'hits.hits.inner_hits.earliest.hits.hits._source.index_stats.primaries.indexing.index_total',
      'hits.hits.inner_hits.earliest.hits.hits._source.elasticsearch.index.primaries.indexing.index_total',
      'hits.hits.inner_hits.earliest.hits.hits._source.index_stats.total.search.query_total',
      'hits.hits.inner_hits.earliest.hits.hits._source.elasticsearch.index.total.search.query_total',
    ],
    body: {
      query: createQuery({
        type,
        dsDataset: `${moduleType}.${dataset}`,
        metricset: dataset,
        start,
        end,
        clusterUuid,
        metric: metricFields,
        filters,
      }),
      collapse: {
        field: 'index_stats.index',
        inner_hits: {
          name: 'earliest',
          size: 1,
          sort: [{ timestamp: { order: 'asc', unmapped_type: 'long' } }],
        },
      },
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
    },
  };
}

export function getIndices(
  req: LegacyRequest,
  showSystemIndices: boolean = false,
  shardStats: any
) {
  const { min: start, max: end } = req.payload.timeRange;

  const clusterUuid = req.params.clusterUuid;
  const config = req.server.config;
  const params = buildGetIndicesQuery(req, clusterUuid, {
    start,
    end,
    showSystemIndices,
    size: config.ui.max_bucket_size,
  });

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then((resp) =>
    handleResponse(resp, start, end, shardStats)
  );
}
