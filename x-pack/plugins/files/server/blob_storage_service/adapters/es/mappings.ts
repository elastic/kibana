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
   * Custom data that can be added by any application for retrieval purposes.
   *
   * @note Suitable for tags or other identifiers.
   */
  app_search_data?: {
    [key: string]: JsonValue | undefined;
  };

  /**
   * Custom data that can be added by an application for its own purposes.
   *
   * @note Suitable for data about a file chunk that should not be searchable but
   * used by an application when downloaded later.
   */
  app_extra_data?: {
    [key: string]: JsonValue | undefined;
  };
}

export const mappings: MappingTypeMapping = {
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
    app_search_data: {
      type: 'object',
      dynamic: true,
      properties: {},
    },
    app_extra_data: {
      enabled: false, // Do not parse this value for mapping in ES
      type: 'object',
    },
  } as Record<keyof FileChunkDocument, MappingProperty>, // Ensure that our ES types and TS types stay somewhat in sync
} as const;
