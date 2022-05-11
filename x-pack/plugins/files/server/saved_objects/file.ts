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
  created_at: {
    type: 'date',
  },
  updated_at: {
    type: 'date',
  },
  name: {
    type: 'text',
  },
  alt: {
    type: 'text',
  },
  status: {
    type: 'keyword',
  },
  content_ref: {
    type: 'keyword',
  },
  mime: {
    type: 'keyword',
  },
  extension: {
    type: 'keyword',
  },
  size: {
    type: 'long',
  },
  meta: {
    type: 'object',
  },
  plugin_id: {
    type: 'keyword',
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
