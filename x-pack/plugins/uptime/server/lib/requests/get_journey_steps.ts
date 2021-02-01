/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters/framework';
import { Ping } from '../../../common/runtime_types';

interface GetJourneyStepsParams {
  checkGroup: string;
  stepTypes?: string | string[];
}

const defaultStepTypes = ['step/end', 'stderr', 'cmd/status', 'step/screenshot'];

export const formatStepTypes = (stepTypes?: string | string[]) => {
  if (!stepTypes) {
    return defaultStepTypes;
  } else {
    return Array.isArray(stepTypes) ? stepTypes : [stepTypes];
  }
};

export const getJourneySteps: UMElasticsearchQueryFn<GetJourneyStepsParams, Ping> = async ({
  uptimeEsClient,
  checkGroup,
  stepTypes,
}) => {
  const params = {
    query: {
      bool: {
        filter: [
          {
            terms: {
              'synthetics.type': formatStepTypes(stepTypes),
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
    size: 500,
  };
  const { body: result } = await uptimeEsClient.search({ body: params });

  const screenshotIndexes: number[] = result.hits.hits
    .filter((h) => (h?._source as Ping).synthetics?.type === 'step/screenshot')
    .map((h) => (h?._source as Ping).synthetics?.step?.index as number);

  return (result.hits.hits
    .filter((h) => (h?._source as Ping).synthetics?.type !== 'step/screenshot')
    .map((h) => {
      const source = h._source as Ping & { '@timestamp': string };
      return {
        ...source,
        timestamp: source['@timestamp'],
        docId: h._id,
        synthetics: {
          ...source.synthetics,
          screenshotExists: screenshotIndexes.some((i) => i === source.synthetics?.step?.index),
        },
      };
    }) as unknown) as Ping;
};
