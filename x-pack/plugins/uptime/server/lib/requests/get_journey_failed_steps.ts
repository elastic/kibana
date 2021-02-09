/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryContainer } from '@elastic/elasticsearch/api/types';
import { asMutableArray } from '../../../../apm/common/utils/as_mutable_array';
import { UMElasticsearchQueryFn } from '../adapters/framework';
import { Ping } from '../../../common/runtime_types';

export interface GetJourneyStepsParams {
  checkGroups: string[];
}

export const getJourneyFailedSteps: UMElasticsearchQueryFn<GetJourneyStepsParams, Ping> = async ({
  uptimeEsClient,
  checkGroups,
}) => {
  const params = {
    query: {
      bool: {
        filter: [
          {
            terms: {
              'synthetics.type': ['step/end'],
            },
          },
          {
            exists: {
              field: 'synthetics.error',
            },
          },
          {
            terms: {
              'monitor.check_group': checkGroups,
            },
          },
        ] as QueryContainer[],
      },
    },
    sort: asMutableArray([
      { 'synthetics.step.index': { order: 'asc' } },
      { '@timestamp': { order: 'asc' } },
    ] as const),
    _source: {
      excludes: ['synthetics.blob'],
    },
    size: 500,
  };

  const { body: result } = await uptimeEsClient.search({ body: params });

  return (result.hits.hits.map((h) => {
    const source = h._source as Ping & { '@timestamp': string };
    return {
      ...source,
      timestamp: source['@timestamp'],
    };
  }) as unknown) as Ping;
};
