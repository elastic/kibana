/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters/framework';

interface GetJourneyScreenshotParams {
  checkGroup: string;
  stepIndex: number;
}

export const getJourneyScreenshot: UMElasticsearchQueryFn<
  GetJourneyScreenshotParams,
  any
> = async ({ callES, dynamicSettings, checkGroup, stepIndex }) => {
  const params: any = {
    index: dynamicSettings.heartbeatIndices,
    body: {
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
            {
              term: {
                'synthetics.step.index': stepIndex,
              },
            },
          ],
        },
      },
      _source: ['synthetics.blob'],
    },
  };
  const { body: result } = await callES.search(params);
  if (!Array.isArray(result?.hits?.hits) || result.hits.hits.length < 1) {
    return null;
  }
  return result.hits.hits.map(({ _source }: any) => _source?.synthetics?.blob ?? null)[0];
};
