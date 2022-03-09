/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { UMElasticsearchQueryFn } from '../adapters/framework';
import { JourneyStep } from '../../../common/runtime_types/ping/synthetics';

export interface GetJourneyStepsParams {
  checkGroup: string;
  syntheticEventTypes?: string | string[];
}

const defaultEventTypes = [
  'cmd/status',
  'journey/browserconsole',
  'step/end',
  'step/screenshot',
  'step/screenshot_ref',
];

export const formatSyntheticEvents = (eventTypes?: string | string[]) => {
  if (!eventTypes) {
    return defaultEventTypes;
  } else {
    return Array.isArray(eventTypes) ? eventTypes : [eventTypes];
  }
};

type ResultType = JourneyStep & { '@timestamp': string };

export const getJourneySteps: UMElasticsearchQueryFn<
  GetJourneyStepsParams,
  JourneyStep[]
> = async ({ uptimeEsClient, checkGroup, syntheticEventTypes }) => {
  const params = {
    query: {
      bool: {
        filter: [
          {
            terms: {
              'synthetics.type': formatSyntheticEvents(syntheticEventTypes),
            },
          },
          {
            term: {
              'monitor.check_group': checkGroup,
            },
          },
        ] as QueryDslQueryContainer,
      },
    },
    sort: asMutableArray([
      { 'synthetics.step.index': { order: 'asc' } },
      { '@timestamp': { order: 'asc' } },
    ] as const),
    _source: {
      excludes: ['synthetics.blob', 'screenshot_ref'],
    },
    size: 500,
  };
  const { body: result } = await uptimeEsClient.search({ body: params });

  const steps = result.hits.hits.map(
    ({ _id, _source }) => Object.assign({ _id }, _source) as ResultType
  );

  const screenshotIndexList: number[] = [];
  const refIndexList: number[] = [];
  const stepsWithoutImages: ResultType[] = [];

  /**
   * Store screenshot indexes, we use these to determine if a step has a screenshot below.
   * Store steps that are not screenshots, we return these to the client.
   */
  for (const step of steps) {
    const { synthetics } = step;
    if (synthetics.type === 'step/screenshot' && synthetics?.step?.index) {
      screenshotIndexList.push(synthetics.step.index);
    } else if (synthetics.type === 'step/screenshot_ref' && synthetics?.step?.index) {
      refIndexList.push(synthetics.step.index);
    } else {
      stepsWithoutImages.push(step);
    }
  }

  return stepsWithoutImages.map(({ _id, ...rest }) => ({
    _id,
    ...rest,
    timestamp: rest['@timestamp'],
    synthetics: {
      ...rest.synthetics,
      isFullScreenshot: screenshotIndexList.some((i) => i === rest?.synthetics?.step?.index),
      isScreenshotRef: refIndexList.some((i) => i === rest?.synthetics?.step?.index),
    },
  }));
};
