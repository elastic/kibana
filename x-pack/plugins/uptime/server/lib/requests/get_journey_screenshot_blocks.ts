/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { ScreenshotBlockDoc } from '../../../common/runtime_types';
import { UMElasticsearchQueryFn } from '../adapters/framework';

const ScreenshotBlockResultType = t.array(
  t.type({
    _id: t.string,
    _source: t.type({
      synthetics: t.type({
        blob: t.string,
        blob_mime: t.string,
      }),
    }),
  })
);

export const getJourneyScreenshotBlocks: UMElasticsearchQueryFn<
  { blockIds: string[] },
  ScreenshotBlockDoc[]
> = async ({ blockIds, uptimeEsClient }) => {
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
    size: 1000,
    _source: ['synthetics.blob', 'synthetics.blob_mime'],
  };

  const fetchScreenshotBlocksResult = await uptimeEsClient.search({ body });

  const decoded = ScreenshotBlockResultType.decode(fetchScreenshotBlocksResult.body.hits.hits);

  if (!isRight(decoded)) {
    throw Error('Error parsing journey screenshot blocks. Malformed data.');
  }

  return decoded.right.map(({ _id, _source }) => ({
    id: _id,
    ..._source,
  }));
};
