/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { SearchHit } from 'src/core/types/elasticsearch/search';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { UMElasticsearchQueryFn } from '../adapters/framework';
import { Ping } from '../../../common/runtime_types';

export interface GetJourneyStepsParams {
  checkGroup: string;
  syntheticEventTypes?: string | string[];
}

const defaultEventTypes = ['step/end', 'cmd/status', 'step/screenshot', 'journey/browserconsole'];

export const formatSyntheticEvents = (eventTypes?: string | string[]) => {
  if (!eventTypes) {
    return defaultEventTypes;
  } else {
    return Array.isArray(eventTypes) ? eventTypes : [eventTypes];
  }
};

export const getJourneySteps: UMElasticsearchQueryFn<GetJourneyStepsParams, Ping> = async ({
  uptimeEsClient,
  checkGroup,
  syntheticEventTypes,
}) => {
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
      excludes: ['synthetics.blob'],
    },
    size: 500,
  };
  const { body: result } = await uptimeEsClient.search({ body: params });

  const screenshotIndexes: number[] = (result.hits.hits as Array<SearchHit<Ping>>)
    .filter((h) => h._source?.synthetics?.type === 'step/screenshot')
    .map((h) => h._source?.synthetics?.step?.index as number);

  return ((result.hits.hits as Array<SearchHit<Ping>>)
    .filter((h) => h._source?.synthetics?.type !== 'step/screenshot')
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
