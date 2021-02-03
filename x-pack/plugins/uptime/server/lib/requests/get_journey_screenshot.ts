/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters/framework';
import { Ping } from '../../../common/runtime_types/ping';

interface GetJourneyScreenshotParams {
  checkGroup: string;
  stepIndex: number;
}

export const getJourneyScreenshot: UMElasticsearchQueryFn<
  GetJourneyScreenshotParams,
  any
> = async ({ uptimeEsClient, checkGroup, stepIndex }) => {
  const params = {
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
              'synthetics.type': 'step/screenshot',
            },
          },
        ],
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
              _source: ['synthetics.blob', 'synthetics.step.name'],
            },
          },
        },
      },
    },
  };
  const { body: result } = await uptimeEsClient.search({ body: params });

  if (result?.hits?.total.value < 1) {
    return null;
  }

  const stepHit = result?.aggregations?.step.image.hits.hits[0]._source as Ping;

  return {
    blob: stepHit.synthetics?.blob ?? null,
    stepName: stepHit?.synthetics?.step?.name ?? '',
    totalSteps: result?.hits?.total.value,
  };
};
