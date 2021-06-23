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
import {
  RefResult,
  RefResultType,
  Screenshot,
  ScreenshotType,
} from '../../../common/runtime_types';

const ResultWrapperType = t.array(
  t.type({
    _source: t.union([RefResultType, ScreenshotType]),
  })
);

export type ScreenshotReturnTypesUnion = ((Screenshot | RefResult) & { totalSteps: number }) | null;

export const getJourneyScreenshot: UMElasticsearchQueryFn<
  { checkGroup: string; stepIndex: number },
  ScreenshotReturnTypesUnion
> = async ({ checkGroup, stepIndex, uptimeEsClient }) => {
  const body = {
    track_total_hits: true,
    size: 0,
    query: {
      bool: {
        filter: [
          {
            term: {
              'monitor.check_group': checkGroup,
            },
          },
          {
            terms: {
              'synthetics.type': ['step/screenshot', 'step/screenshot_ref'],
            },
          },
        ] as QueryDslQueryContainer[],
      },
    },
    aggs: {
      step: {
        filter: {
          term: {
            'synthetics.step.index': stepIndex,
          },
        },
        aggs: {
          image: {
            top_hits: {
              size: 1,
              _source: [
                '@timestamp',
                'monitor.check_group',
                'screenshot_ref',
                'synthetics.package_version',
                'synthetics.step',
                'synthetics.type',
                'synthetics.blob',
                'synthetics.blob_mime',
                'synthetics.step.name',
              ],
            },
          },
        },
      },
    },
  };

  const result = await uptimeEsClient.search({ body });

  const decoded = ResultWrapperType.decode(result.body.aggregations?.step.image.hits.hits ?? null);

  if (!isRight(decoded)) throw Error('Error parsing journey screenshot type. Malformed data.');

  const screenshotsOrRefs = decoded.right;

  if (screenshotsOrRefs.length > 1) {
    throw Error(
      'Error parsing journey screenshot type. There should only be one screenshot per step.'
    );
  }

  if (screenshotsOrRefs.length === 0) return null;

  return {
    ...screenshotsOrRefs[0]._source,
    totalSteps: result.body.hits.total.value,
  };
};
