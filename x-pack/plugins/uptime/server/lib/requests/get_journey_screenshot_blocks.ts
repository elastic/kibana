/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import { isRight } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { UMElasticsearchQueryFn } from '../adapters/framework';

const ScreenshotBlockDoc = t.type({
  synthetics: t.type({
    blob: t.string,
    blob_mime: t.string,
  }),
});

const ScreenshotBlockResultType = t.array(
  t.type({
    _id: t.string,
    _source: ScreenshotBlockDoc,
  })
);

export type ScreenshotBlock = Omit<t.TypeOf<typeof ScreenshotBlockDoc>, '@timestamp'> & {
  id: string;
};

export const getJourneyScreenshotBlocks: UMElasticsearchQueryFn<
  { blockIds: string[] },
  ScreenshotBlock[]
> = async ({ blockIds, uptimeEsClient }) => {
  return withSpan('fetch-journey-blocks', async () => {
    const body = {
      query: {
        bool: {
          filter: [
            {
              ids: {
                values: blockIds,
              },
            },
          ],
        },
      },
      size: 10000,
      _source: ['synthetics.blob', 'synthetics.blob_mime'],
    };

    const fetchScreenshotBlocksResult = await uptimeEsClient.search({ body });

    const decoded = ScreenshotBlockResultType.decode(fetchScreenshotBlocksResult.body.hits.hits);

    if (!isRight(decoded)) {
      throw Error('Error parsing Journey screenshot blocks. Malformed data.');
    }

    return decoded.right.map(({ _id, _source }) => ({
      id: _id,
      ..._source,
    }));
  });
};
