/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { knowledgeBaseEntryTypeName } from '../../common/consts';
import type {
  KnowledgeBaseEntrySource,
  KnowledgeBaseEntryInstalledBy,
} from '../../common/saved_objects';

/**
 * Interface describing the raw attributes of the KB Entry SO type.
 * Contains more fields than the mappings, which only list
 * indexed fields.
 */
export interface KnowledgeBaseEntryAttributes {
  name: string;
  description?: string;
  source: KnowledgeBaseEntrySource;
  installed_by: KnowledgeBaseEntryInstalledBy;
}

export const knowledgeBaseEntrySavedObjectType: SavedObjectsType<KnowledgeBaseEntryAttributes> = {
  name: knowledgeBaseEntryTypeName,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'keyword' },
      source: {
        type: 'object',
        dynamic: false,
        properties: {
          type: { type: 'keyword' },
        },
      },
      installed_by: {
        type: 'object',
        dynamic: false,
        properties: {
          type: { type: 'keyword' },
        },
      },
    },
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {},
};
