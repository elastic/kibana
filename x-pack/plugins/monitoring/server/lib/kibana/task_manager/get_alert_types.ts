/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { LegacyCallAPIOptions } from 'kibana/server';
// @ts-ignore
import { checkParam } from '../../error_missing_required';
import { ElasticsearchResponse } from '../../../..//common/types/es';

interface ESResponse {
  aggregations?: {
    nest?: {
      types?: {
        buckets?: Array<{
          key: string;
        }>;
      };
    };
  };
}

export function handleResponse(response: ESResponse) {
  return response.aggregations?.nest?.types?.buckets?.map((type) => type.key);
}

export async function getAlertTypes(
  callCluster: (
    endpoint: string,
    clientParams: Record<string, any>,
    options?: LegacyCallAPIOptions
  ) => Promise<ElasticsearchResponse>,
  kbnIndexPattern: string,
  {
    clusterUuid,
    kibanaUuid,
    query,
  }: { clusterUuid?: string; kibanaUuid?: string; query?: { bool: Record<string, any> } }
) {
  checkParam(kbnIndexPattern, 'kbnIndexPattern in getAlertTypes');

  const filter = [];
  if (clusterUuid) {
    filter.push({ term: { cluster_uuid: clusterUuid } });
  }
  if (kibanaUuid) {
    filter.push({ term: { 'kibana_stats.kibana.uuid': kibanaUuid } });
  }

  const mergedQuery = merge({ bool: { filter } }, query);

  const params = {
    index: kbnIndexPattern,
    size: 0,
    ignoreUnavailable: true,
    filterPath: ['aggregations.nest.types.buckets'],
    body: {
      query: mergedQuery,
      aggs: {
        nest: {
          nested: {
            path: 'kibana_stats.task_manager.drift.by_type',
          },
          aggs: {
            types: {
              terms: {
                field: 'kibana_stats.task_manager.drift.by_type.alertType',
                size: 1000, // TODO: how to paginate properly here
              },
            },
          },
        },
      },
    },
  };

  const response = await callCluster('search', params);
  return handleResponse(response);
}
