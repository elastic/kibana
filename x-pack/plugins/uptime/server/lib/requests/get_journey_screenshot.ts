/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters/framework';
import { ESSearchBody } from '../../../../../typings/elasticsearch';

interface GetJourneyScreenshotParams {
  checkGroup: string;
  stepIndex: number;
}

export const getJourneyScreenshot: UMElasticsearchQueryFn<
  GetJourneyScreenshotParams,
  any
> = async ({ uptimeEsClient, checkGroup, stepIndex }) => {
  const params: ESSearchBody = {
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
  };
  const { body: result } = await uptimeEsClient.search({ body: params });
  if (!Array.isArray(result?.hits?.hits) || result.hits.hits.length < 1) {
    return null;
  }
  return result.hits.hits.map(({ _source }: any) => _source?.synthetics?.blob ?? null)[0];
};
