/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import _ from 'lodash';
import { checkParam } from '../error_missing_required';
import { createQuery } from '../create_query';
import { ElasticsearchMetric } from '../metrics';

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
export function filterOldShardActivity(startMs) {
  return (activity) => {
    // either it's still going and there is no stop time, or the stop time happened after we started looking for one
    return !_.isNumber(activity.stop_time_in_millis) || activity.stop_time_in_millis >= startMs;
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
export function handleLastRecoveries(resp, start) {
  if (resp.hits.hits.length === 1) {
    const data = _.get(resp.hits.hits[0], '_source.index_recovery.shards', []).filter(
      filterOldShardActivity(moment.utc(start).valueOf())
    );
    data.sort((a, b) => b.start_time_in_millis - a.start_time_in_millis);
    return data;
  }

  return [];
}

export function getLastRecovery(req, esIndexPattern) {
  checkParam(esIndexPattern, 'esIndexPattern in elasticsearch/getLastRecovery');

  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;
  const clusterUuid = req.params.clusterUuid;

  const metric = ElasticsearchMetric.getMetricFields();
  const params = {
    index: esIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    body: {
      _source: ['index_recovery.shards'],
      sort: { timestamp: { order: 'desc' } },
      query: createQuery({ type: 'index_recovery', start, end, clusterUuid, metric }),
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then((resp) => {
    return handleLastRecoveries(resp, start);
  });
}
