/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  Logger,
  SavedObject,
  SavedObjectsExportTransformContext,
  SavedObjectsType,
} from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../common/constants';
import type { ESCaseAttributes } from '../services/cases/types';
import { handleExport } from './import_export/export';
import { caseMigrations } from './migrations';

export const createCaseSavedObjectType = (
  coreSetup: CoreSetup,
  logger: Logger
): SavedObjectsType => ({
  name: CASE_SAVED_OBJECT,
  hidden: true,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  mappings: {
    dynamic: false,
    properties: {
      assignees: {
        properties: {
          uid: {
            type: 'keyword',
          },
        },
      },
      closed_at: {
        type: 'date',
      },
      created_at: {
        type: 'date',
      },
      created_by: {
        properties: {
          username: {
            type: 'keyword',
          },
          profile_uid: {
            type: 'keyword',
          },
        },
      },
      duration: {
        type: 'unsigned_long',
      },
      description: {
        type: 'text',
      },
      owner: {
        type: 'keyword',
      },
      title: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      status: {
        type: 'short',
      },
      tags: {
        type: 'keyword',
      },
      updated_at: {
        type: 'date',
      },
      settings: {
        properties: {
          syncAlerts: {
            type: 'boolean',
          },
        },
      },
      severity: {
        type: 'short',
      },
      total_alerts: {
        type: 'integer',
      },
      total_comments: {
        type: 'integer',
      },
    },
  },
  migrations: caseMigrations,
  management: {
    importableAndExportable: true,
    defaultSearchField: 'title',
    icon: 'casesApp',
    getTitle: (savedObject: SavedObject<ESCaseAttributes>) => savedObject.attributes.title,
    onExport: async (
      context: SavedObjectsExportTransformContext,
      objects: Array<SavedObject<ESCaseAttributes>>
    ) => handleExport({ context, objects, coreSetup, logger }),
  },
});
