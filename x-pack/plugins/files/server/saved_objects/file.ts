/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType, SavedObjectsFieldMapping } from '@kbn/core/server';
import { FILE_SO_TYPE } from '../../common';
import type { FileSavedObjectAttributes } from '../../common';

type Properties = Record<keyof FileSavedObjectAttributes, SavedObjectsFieldMapping>;

const properties: Properties = {
  created: {
    type: 'date',
  },
  Updated: {
    type: 'date',
  },
  name: {
    type: 'text',
  },
  Alt: {
    type: 'text',
  },
  Status: {
    type: 'keyword',
  },
  mime_type: {
    type: 'keyword',
  },
  extension: {
    type: 'keyword',
  },
  size: {
    type: 'long',
  },
  Meta: {
    type: 'flattened',
  },
  FileKind: {
    type: 'keyword',
  },
  ChunkSize: {
    type: 'long',
  },
  Compression: {
    type: 'keyword',
  },
  hash: {
    type: 'flattened',
  },
};

export const fileObjectType: SavedObjectsType<FileSavedObjectAttributes> = {
  name: FILE_SO_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  management: {
    importableAndExportable: false,
  },
  mappings: {
    dynamic: false,
    properties,
  },
};
