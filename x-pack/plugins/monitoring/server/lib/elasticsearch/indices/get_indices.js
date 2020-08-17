/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { checkParam } from '../../error_missing_required';
import { ElasticsearchMetric } from '../../metrics';
import { createQuery } from '../../create_query';
import { calculateRate } from '../../calculate_rate';
import { getUnassignedShards } from '../shards';
import { i18n } from '@kbn/i18n';

export function handleResponse(resp, min, max, shardStats) {
  // map the hits
  const hits = get(resp, 'hits.hits', []);
  return hits.map((hit) => {
    const stats = get(hit, '_source.index_stats');
    const earliestStats = get(hit, 'inner_hits.earliest.hits.hits[0]._source.index_stats');

    const rateOptions = {
      hitTimestamp: get(hit, '_source.timestamp'),
      earliestHitTimestamp: get(hit, 'inner_hits.earliest.hits.hits[0]._source.timestamp'),
      timeWindowMin: min,
      timeWindowMax: max,
    };

    const earliestIndexingHit = get(earliestStats, 'primaries.indexing');
    const { rate: indexRate } = calculateRate({
      latestTotal: get(stats, 'primaries.indexing.index_total'),
      earliestTotal: get(earliestIndexingHit, 'index_total'),
      ...rateOptions,
    });

    const earliestSearchHit = get(earliestStats, 'total.search');
    const { rate: searchRate } = calculateRate({
      latestTotal: get(stats, 'total.search.query_total'),
      earliestTotal: get(earliestSearchHit, 'query_total'),
      ...rateOptions,
    });

    const shardStatsForIndex = get(shardStats, ['indices', stats.index]);

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
      name: stats.index,
      status,
      doc_count: get(stats, 'primaries.docs.count'),
      data_size: get(stats, 'total.store.size_in_bytes'),
      index_rate: indexRate,
      search_rate: searchRate,
      unassigned_shards: unassignedShards,
      status_sort: statusSort,
    };
  });
}

export function buildGetIndicesQuery(
  esIndexPattern,
  clusterUuid,
  { start, end, size, showSystemIndices = false }
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

  return {
    index: esIndexPattern,
    size,
    ignoreUnavailable: true,
    filterPath: [
      // only filter path can filter for inner_hits
      'hits.hits._source.index_stats.index',
      'hits.hits._source.index_stats.primaries.docs.count',
      'hits.hits._source.index_stats.total.store.size_in_bytes',

      // latest hits for calculating metrics
      'hits.hits._source.timestamp',
      'hits.hits._source.index_stats.primaries.indexing.index_total',
      'hits.hits._source.index_stats.total.search.query_total',

      // earliest hits for calculating metrics
      'hits.hits.inner_hits.earliest.hits.hits._source.timestamp',
      'hits.hits.inner_hits.earliest.hits.hits._source.index_stats.primaries.indexing.index_total',
      'hits.hits.inner_hits.earliest.hits.hits._source.index_stats.total.search.query_total',
    ],
    body: {
      query: createQuery({
        type: 'index_stats',
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
          sort: [{ timestamp: 'asc' }],
        },
      },
      sort: [{ timestamp: { order: 'desc' } }],
    },
  };
}

export function getIndices(req, esIndexPattern, showSystemIndices = false, shardStats) {
  checkParam(esIndexPattern, 'esIndexPattern in elasticsearch/getIndices');

  const { min: start, max: end } = req.payload.timeRange;

  const clusterUuid = req.params.clusterUuid;
  const config = req.server.config();
  const params = buildGetIndicesQuery(esIndexPattern, clusterUuid, {
    start,
    end,
    showSystemIndices,
    size: config.get('monitoring.ui.max_bucket_size'),
  });

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then((resp) =>
    handleResponse(resp, start, end, shardStats)
  );
}
