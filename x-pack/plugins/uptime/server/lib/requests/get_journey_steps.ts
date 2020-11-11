/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters/framework';
import { Ping } from '../../../common/runtime_types';

interface GetJourneyStepsParams {
  checkGroup: string;
}

export const getJourneySteps: UMElasticsearchQueryFn<GetJourneyStepsParams, Ping> = async ({
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
              terms: {
                'synthetics.type': ['step/end', 'stderr', 'cmd/status', 'step/screenshot'],
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
      sort: [{ 'synthetics.step.index': { order: 'asc' } }, { '@timestamp': { order: 'asc' } }],
      _source: {
        excludes: ['synthetics.blob'],
      },
    },
    size: 500,
  };
  const { body: result } = await callES.search(params);
  const screenshotIndexes: number[] = result.hits.hits
    .filter((h: any) => h?._source?.synthetics?.type === 'step/screenshot')
    .map((h: any) => h?._source?.synthetics?.step?.index);
  return result.hits.hits
    .filter((h: any) => h?._source?.synthetics?.type !== 'step/screenshot')
    .map(
      ({ _id, _source, _source: { synthetics } }: any): Ping => ({
        ..._source,
        timestamp: _source['@timestamp'],
        docId: _id,
        synthetics: {
          ...synthetics,
          screenshotExists: screenshotIndexes.some((i) => i === synthetics?.step?.index),
        },
      })
    );
};
