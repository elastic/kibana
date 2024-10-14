/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { PreviewTikaResponse } from '../common/types';

/**
 * Returns the contents of a file using the attachment ingest processor
 * @param client IScopedClusterClient
 * @param base64File bae64 encoded file
 */
export async function previewTikaContents(
  client: IScopedClusterClient,
  base64File: string
): Promise<PreviewTikaResponse> {
  const pipeline = {
    description: '',
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

  if (!resp.docs[0].doc?._source.attachment) {
    throw new Error('Failed to extract text from file.');
  }

  return resp.docs[0].doc?._source.attachment;
}
