/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { UMElasticsearchQueryFn } from '../adapters/framework';
import { JourneyStepType, JourneyStep } from '../../../common/runtime_types';
export interface GetJourneyStepsParams {
  checkGroup: string;
  syntheticEventTypes?: string | string[];
}

const defaultEventTypes = [
  'step/end',
  'cmd/status',
  'step/screenshot',
  'journey/browserconsole',
  'step/screenshot_ref',
];

export const formatSyntheticEvents = (eventTypes?: string | string[]) => {
  if (!eventTypes) {
    return defaultEventTypes;
  } else {
    return Array.isArray(eventTypes) ? eventTypes : [eventTypes];
  }
};

const ResultHit = t.type({
  _id: t.string,
  _source: t.intersection([JourneyStepType, t.type({ '@timestamp': t.string })]),
});

const parseResult = (hits: unknown) => {
  const decoded = t.array(ResultHit).decode(result.hits.hits);
  if (!isRight(decoded)) {
    throw Error(
      `Error processing synthetic journey steps for check group ${checkGroup}. Malformed data.`
    );
  }
  return decoded.right;
};

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

  const steps = parseResult(result.hits.hits);

  const screenshotIndexList: number[] = [];
  const refIndexList: number[] = [];
  const stepsWithoutImages: Array<t.TypeOf<typeof ResultHit>> = [];

  /**
   * Store screenshot indexes for later tagging.
   * Store steps that are not screenshots, we return these to the client.
   */
  for (const step of steps) {
    const {
      _source: { synthetics },
    } = step;
    if (synthetics.type === 'step/screenshot') {
      screenshotIndexList.push(synthetics.step.index);
    } else if (synthetics.type === 'step/screenshot_ref') {
      refIndexList.push(synthetics.step.index);
    } else {
      stepsWithoutImages.push(step);
    }
  }

  return stepsWithoutImages.map(({ _id, _source }) => ({
    ..._source,
    timestamp: _source['@timestamp'],
    docId: _id,
    synthetics: {
      ..._source.synthetics,
      screenshotExists: screenshotIndexList.some((i) => i === _source.synthetics.step.index),
      isScreenshotRef: refIndexList.some((i) => i === _source.synthetics.step.index),
    },
  }));
};
