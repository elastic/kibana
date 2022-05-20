/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface FileChunkDocument {
  content: string;
  head_chunk_id?: string;
}

export const mappings: MappingTypeMapping = {
  properties: {
    content: { type: 'binary', index: false }, // Base64 encoded content
    head_chunk_id: { type: 'keyword' },
  },
} as const;
