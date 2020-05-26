/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { StatsCollectionConfig } from 'src/plugins/telemetry_collection_manager/server';
// @ts-ignore
import { buildGetIndicesQuery } from '../lib/elasticsearch/indices';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../common/constants';
import {
  buildDataTelemetryPayload,
  DataTelemetryIndex,
} from '../../../../../src/plugins/telemetry/server/';

interface IndexStatsSearchResponse {
  index_stats: {
    index: string;
    primaries: {
      docs: {
        count: number;
      };
    };
    total: {
      store: {
        size_in_bytes: number;
      };
    };
  };
}

export function handleResponse(response: SearchResponse<IndexStatsSearchResponse>) {
  const reducedIndices: DataTelemetryIndex[] = (response.hits?.hits || []).map(({ _source }) => ({
    name: _source.index_stats.index,
    docCount: _source.index_stats.primaries.docs.count,
    sizeInBytes: _source.index_stats.total.store.size_in_bytes,
  }));

  return buildDataTelemetryPayload(reducedIndices);
}

export async function getDataTelemetry(
  callCluster: StatsCollectionConfig['callCluster'],
  clusterUuids: string[],
  start: StatsCollectionConfig['start'],
  end: StatsCollectionConfig['end'],
  maxBucketSize: number
) {
  const responses = await Promise.all(
    clusterUuids.map(async (clusterUuid) => {
      // Should we take into consideration CCS? https://github.com/elastic/kibana/blob/3a396027f669803e1a3143237578973fb1ab20d0/x-pack/plugins/monitoring/server/routes/api/v1/elasticsearch/indices.js#L42
      const index = INDEX_PATTERN_ELASTICSEARCH;
      const params = buildGetIndicesQuery(index, clusterUuid, {
        start,
        end,
        size: maxBucketSize,
        showSystemIndices: true,
      });
      const response = await callCluster<IndexStatsSearchResponse>('search', params);
      return { [clusterUuid]: handleResponse(response) };
    })
  );
  return responses.reduce((acc, response) => ({ ...acc, ...response }), {});
}
