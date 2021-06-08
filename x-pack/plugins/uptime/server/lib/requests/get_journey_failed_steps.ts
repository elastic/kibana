/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { isRight } from 'fp-ts/lib/Either';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { UMElasticsearchQueryFn } from '../adapters/framework';
import { JourneyFailedStepType, JourneyFailedStep } from '../../../common/runtime_types';

export interface GetJourneyStepsParams {
  checkGroups: string[];
}

export const getJourneyFailedSteps: UMElasticsearchQueryFn<
  GetJourneyStepsParams,
  JourneyFailedStep[]
> = async ({ uptimeEsClient, checkGroups }) => {
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
        ] as QueryDslQueryContainer[],
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

  return result.hits.hits.map((h) => {
    const decoded = JourneyFailedStepType.decode(h._source);
    if (!isRight(decoded)) {
      throw Error(
        'Unable to parse data for failed journey steps. Invalid format or missing fields.'
      );
    }
    const { right: step } = decoded;
    return {
      timestamp: step['@timestamp'],
      ...step,
    };
  });
};
