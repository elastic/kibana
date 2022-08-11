/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileMetadata, FileJSON } from '../../common/types';

export function toJSON<M = unknown>(id: string, attrs: FileMetadata): FileJSON<M> {
  const {
    name,
    mime_type: mimeType,
    size,
    created,
    Updated,
    FileKind,
    Status,
    Alt,
    extension,
    Meta,
  } = attrs;
  return {
    id,
    name,
    mimeType,
    size,
    created,
    extension,
    alt: Alt,
    status: Status,
    meta: Meta as M,
    updated: Updated,
    fileKind: FileKind,
  };
}
