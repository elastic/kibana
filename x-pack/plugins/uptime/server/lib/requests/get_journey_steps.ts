/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters/framework';

interface GetJourneyStepsParams {
  checkGroup: string;
}

export const getJourneySteps: UMElasticsearchQueryFn<GetJourneyStepsParams, any> = async ({
  callES,
  dynamicSettings,
  checkGroup,
}) => {
  const params: any = {
    index: dynamicSettings.heartbeatIndices,
    body: {
      query: {
        bool: {
          filter: [
            {
              term: {
                'synthetics.type': 'step/end',
              },
            },
            {
              term: {
                'monitor.check_group': checkGroup,
              },
            },
          ],
        },
      },
    },
  };
  const result = await callES('search', params);
  return result.hits.hits.map(({ _source }: any) => ({ ..._source }));
};
