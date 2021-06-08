/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { isRight } from 'fp-ts/lib/Either';
import { UMElasticsearchQueryFn } from '../adapters';
import { RawRefResultType, ScreenshotRef } from '../../../common/runtime_types';

export interface GetJourneyScreenshotRefParams {
  checkGroup: string;
  stepIndex: number;
}

export interface GetJourneyScreenshotRefResult {
  ref: ScreenshotRef;
  stepName: string;
  totalSteps?: number;
}

export const getJourneyScreenshotRef: UMElasticsearchQueryFn<
  GetJourneyScreenshotRefParams,
  GetJourneyScreenshotRefResult
> = async ({ uptimeEsClient, checkGroup, stepIndex }): Promise<any> => {
  const body = {
    track_total_hits: true,
    size: 0,
    query: {
      bool: {
        filter: [
          {
            term: {
              'monitor.check_group': checkGroup,
            },
          },
          {
            term: {
              'synthetics.type': 'step/screenshot_ref',
            },
          },
        ] as QueryDslQueryContainer[],
      },
    },
    aggs: {
      step: {
        filter: {
          term: {
            'synthetics.step.index': stepIndex,
          },
        },
        aggs: {
          image: {
            top_hits: {
              size: 1,
              _source: [
                '@timestamp',
                'monitor.check_group',
                'screenshot_ref',
                'synthetics.package_version',
                'synthetics.step',
                'synthetics.type',
              ],
            },
          },
        },
      },
    },
  };

  const {
    body: {
      hits: { hits, total },
      aggregations,
    },
  } = await uptimeEsClient.search({ body });

  if (hits.length > 1)
    throw Error(
      `Unable to retrieve screenshot for journey step, too many results. Expected 0 or 1. Received ${hits.length}.`
    );

  if (aggregations?.step.image.hits.hits.length === 0) return null;

  const decoded = RawRefResultType.decode(aggregations?.step.image.hits.hits[0]);

  if (!isRight(decoded)) {
    throw Error('Error parsing journey screenshot ref. Malformed data');
  }

  return {
    ref: decoded.right._source,
    totalSteps: total.value,
  };
};
