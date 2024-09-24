/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { chunk as toChunks } from 'lodash';
import type { BulkRequest } from '@elastic/elasticsearch/lib/api/types';

import type { ExtractedDocument } from './extract_documentation';

const chunkSize = 10;

export const indexDocuments = async ({
  index,
  client,
  documents,
}: {
  index: string;
  documents: ExtractedDocument[];
  client: Client;
}) => {
  const chunks = toChunks(documents, chunkSize);

  console.log(`starting indexing process`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const before = Date.now();
    await client.bulk(
      {
        refresh: 'wait_for',
        operations: chunk.reduce((operations, document) => {
          operations!.push(...[{ index: { _index: index } }, document]);
          return operations;
        }, [] as BulkRequest['operations']),
      },
      { requestTimeout: 10 * 60 * 1000 }
    );

    const duration = Date.now() - before;
    console.log(`indexed ${i + 1} of ${chunks.length} chunks (took ${duration})`);
  }
};
