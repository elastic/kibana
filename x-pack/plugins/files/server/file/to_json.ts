/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBy } from 'lodash';
import type { FileMetadata, FileJSON } from '../../common/types';

export function serializeJSON<M = unknown>(attrs: Partial<FileJSON>): Partial<FileMetadata> {
  const {
    name,
    mimeType,
    size,
    created,
    updated,
    fileKind,
    status,
    alt,
    extension,
    meta,
    blurhash,
  } = attrs;
  return pickBy(
    {
      name,
      mime_type: mimeType,
      size,
      created,
      extension,
      Alt: alt,
      Status: status,
      Meta: meta as M,
      Updated: updated,
      FileKind: fileKind,
      Blurhash: blurhash,
    },
    (v) => v != null
  );
}

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
    Blurhash,
  } = attrs;
  return pickBy<FileJSON<M>>(
    {
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
      blurhash: Blurhash,
    },
    (v) => v != null
  ) as FileJSON<M>;
}
