/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { PreviewTikaResponse } from '../common/types';

/**
 * Returns the start and end time range in epoch milliseconds for a given set of documents
 * @param client IScopedClusterClient
 * @param timeField Time field name
 * @param pipeline ingest pipeline config
 * @param docs array of documents
 * @returns start and end time range in epoch milliseconds
 */
export async function previewTikaContents(
  client: IScopedClusterClient,
  base64File: string
): Promise<PreviewTikaResponse> {
  const pipeline = {
    description: 'Ingest pipeline created by text structure finder',
    processors: [
      {
        attachment: {
          field: 'data',
          remove_binary: true,
        },
      },
    ],
  };

  const resp = await client.asInternalUser.ingest.simulate({
    pipeline,
    docs: [
      {
        _index: 'index',
        _id: 'id',
        _source: {
          data: base64File,
        },
      },
    ],
  });

  return resp.docs[0].doc?._source.attachment;
}
