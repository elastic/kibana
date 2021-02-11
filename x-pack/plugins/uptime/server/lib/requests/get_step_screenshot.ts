/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UMElasticsearchQueryFn } from '../adapters/framework';
import { Ping } from '../../../common/runtime_types/ping';

export interface GetStepScreenshotParams {
  monitorId: string;
  timestamp: string;
  stepIndex: number;
}

export const getStepLastSuccessfulScreenshot: UMElasticsearchQueryFn<
  GetStepScreenshotParams,
  any
> = async ({ uptimeEsClient, monitorId, stepIndex, timestamp }) => {
  const params = {
    size: 1,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                lte: timestamp,
              },
            },
          },
          {
            term: {
              'monitor.id': monitorId,
            },
          },
          {
            term: {
              'synthetics.type': 'step/screenshot',
            },
          },
          {
            term: {
              'synthetics.payload.status': 'succeeded',
            },
          },
          {
            term: {
              'synthetics.step.index': stepIndex,
            },
          },
        ],
      },
    },
    _source: ['synthetics.blob', 'synthetics.step.name'],
  };
  const { body: result } = await uptimeEsClient.search({ body: params });

  if (result?.hits?.total.value < 1) {
    return null;
  }

  const stepHit = result?.hits.hits[0]._source as Ping;

  return {
    blob: stepHit.synthetics?.blob ?? null,
    stepName: stepHit?.synthetics?.step?.name ?? '',
  };
};
