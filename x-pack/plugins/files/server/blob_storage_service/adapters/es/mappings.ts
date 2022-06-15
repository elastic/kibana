/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MappingTypeMapping,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { JsonValue } from '@kbn/utility-types';

/**
 * These are the fields we expect to find a given document acting as a file chunk.
 *
 * @note not all fields are used by this adapter but this represents the standard
 * shape for any consumers of BlobStorage in ES.
 */
export interface FileChunkDocument {
  /**
   * Data contents. Could be part of a file (chunk) or the entire file.
   */
  data: string;

  /**
   * If a file spans multiple documents, this field points to the first document.
   *
   * @note This is used to conveniently delete all of a file's chunks by
   * issuing a single delete-by query.
   *
   * @note It is not recommended to use this for file retrieval by query because
   * loading all file chunks into ES memory can degrade cluster performance.
   */
  head_chunk_id?: string;

  /**
   * Size of this document-part (chunk) in bytes.
   */
  size?: number;

  /**
   * Compression used on the file.
   */
  compression?: 'gzip' | string;

  /**
   * Custom data that can be added by an application for its own purposes.
   *
   * @note Suitable for data about a file chunk that should not be searchable but
   * used by an application when downloaded later.
   */
  app_metadata?: {
    [key: string]: JsonValue;
  };
}

export const mappings: MappingTypeMapping = {
  dynamic: false,
  properties: {
    data: { type: 'binary' }, // Base64 encoded content, binary fields are automatically marked as not searchable
    head_chunk_id: { type: 'keyword', index: true },
    size: {
      index: false,
      type: 'long',
    },
    compression: {
      index: false,
      type: 'keyword',
    },
    app_metadata: {
      enabled: false, // Do not parse this value for mapping in ES
      type: 'object',
      properties: {},
    },
  } as Record<keyof FileChunkDocument, MappingProperty>, // Ensure that our ES types and TS types stay somewhat in sync
} as const;
