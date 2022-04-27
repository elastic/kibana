/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  Logger,
  SavedObject,
  SavedObjectsExportTransformContext,
  SavedObjectsType,
} from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../common/constants';
import { ESCaseAttributes } from '../services/cases/types';
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
    properties: {
      closed_at: {
        type: 'date',
      },
      closed_by: {
        properties: {
          username: {
            type: 'keyword',
          },
          full_name: {
            type: 'keyword',
          },
          email: {
            type: 'keyword',
          },
        },
      },
      created_at: {
        type: 'date',
      },
      created_by: {
        properties: {
          username: {
            type: 'keyword',
          },
          full_name: {
            type: 'keyword',
          },
          email: {
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
      connector: {
        properties: {
          name: {
            type: 'text',
          },
          type: {
            type: 'keyword',
          },
          fields: {
            properties: {
              key: {
                type: 'text',
              },
              value: {
                type: 'text',
              },
            },
          },
        },
      },
      external_service: {
        properties: {
          pushed_at: {
            type: 'date',
          },
          pushed_by: {
            properties: {
              username: {
                type: 'keyword',
              },
              full_name: {
                type: 'keyword',
              },
              email: {
                type: 'keyword',
              },
            },
          },
          connector_name: {
            type: 'keyword',
          },
          external_id: {
            type: 'keyword',
          },
          external_title: {
            type: 'text',
          },
          external_url: {
            type: 'text',
          },
        },
      },
      owner: {
        type: 'keyword',
      },
      title: {
        type: 'text',
      },
      status: {
        type: 'keyword',
      },
      tags: {
        type: 'keyword',
      },
      updated_at: {
        type: 'date',
      },
      updated_by: {
        properties: {
          username: {
            type: 'keyword',
          },
          full_name: {
            type: 'keyword',
          },
          email: {
            type: 'keyword',
          },
        },
      },
      settings: {
        properties: {
          syncAlerts: {
            type: 'boolean',
          },
        },
      },
    },
  },
  migrations: caseMigrations,
  management: {
    importableAndExportable: true,
    defaultSearchField: 'title',
    icon: 'folderExclamation',
    getTitle: (savedObject: SavedObject<ESCaseAttributes>) => savedObject.attributes.title,
    onExport: async (
      context: SavedObjectsExportTransformContext,
      objects: Array<SavedObject<ESCaseAttributes>>
    ) => handleExport({ context, objects, coreSetup, logger }),
  },
});
