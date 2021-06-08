/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { UMElasticsearchQueryFn } from '../adapters';

const ScreenshotTypeResultType = t.array(
  t.type({
    _id: t.string,
    _source: t.type({
      synthetics: t.type({
        type: t.union([t.literal('step/screenshot_ref'), t.literal('step/screenshot')]),
      }),
    }),
  })
);

export type JourneyScreenshotType = 'step/screenshot' | 'step/screenshot_ref';

export const getJourneyScreenshotType: UMElasticsearchQueryFn<
  { checkGroup: string; stepIndex: number },
  JourneyScreenshotType | null
> = async ({ checkGroup, stepIndex, uptimeEsClient }) => {
  const body = {
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
              'synthetics.step.index': stepIndex,
            },
          },
          {
            term: {
              'monitor.type': 'browser',
            },
          },
        ] as QueryDslQueryContainer,
        should: [
          {
            term: {
              'synthetics.type': 'step/screenshot_ref',
            },
          },
          {
            term: {
              'synthetics.type': 'step/screenshot',
            },
          },
        ] as QueryDslQueryContainer[],
      },
    },
    _source: ['synthetics.type'],
    size: 1,
  };

  const fetchScreenshotTypeResult = await uptimeEsClient.search({ body });

  const decoded = ScreenshotTypeResultType.decode(fetchScreenshotTypeResult.body.hits.hits);

  if (!isRight(decoded)) throw Error('Error parsing journey screenshot type. Malformed data.');
  const { right: screenshotTypeList } = decoded;
  if (screenshotTypeList.length > 1)
    throw Error(
      'Error parsing journey screenshot type. There should only be one screenshot per step.'
    );
  if (screenshotTypeList.length === 0) return null;

  return screenshotTypeList[0]._source.synthetics.type;
};
