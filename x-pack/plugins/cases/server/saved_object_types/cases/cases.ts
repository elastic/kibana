/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type {
  CoreSetup,
  Logger,
  SavedObject,
  SavedObjectsExportTransformContext,
  SavedObjectsType,
} from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import { handleExport } from '../import_export/export';
import { caseMigrations } from '../migrations';
import { modelVersion1 } from './model_versions';

export const createCaseSavedObjectType = (
  coreSetup: CoreSetup,
  logger: Logger
): SavedObjectsType => ({
  name: CASE_SAVED_OBJECT,
  switchToModelVersionAt: '8.10.0',
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
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
          profile_uid: {
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
              profile_uid: {
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
          profile_uid: {
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
      severity: {
        type: 'short',
      },
      total_alerts: {
        type: 'integer',
      },
      total_comments: {
        type: 'integer',
      },
      category: {
        type: 'keyword',
      },
      customFields: {
        type: 'nested',
        properties: {
          key: {
            type: 'keyword',
          },
          type: {
            type: 'keyword',
          },
          value: {
            type: 'keyword',
            fields: {
              number: {
                type: 'long',
                ignore_malformed: true,
              },
              boolean: {
                type: 'boolean',
                // @ts-expect-error: es types are not correct. ignore_malformed is supported.
                ignore_malformed: true,
              },
              string: {
                type: 'text',
              },
              date: {
                type: 'date',
                ignore_malformed: true,
              },
              ip: {
                type: 'ip',
                ignore_malformed: true,
              },
            },
          },
        },
      },
    },
  },
  migrations: caseMigrations,
  modelVersions: {
    1: modelVersion1,
  },
  management: {
    importableAndExportable: true,
    defaultSearchField: 'title',
    icon: 'casesApp',
    getTitle: (savedObject: SavedObject<CasePersistedAttributes>) => savedObject.attributes.title,
    onExport: async (
      context: SavedObjectsExportTransformContext,
      objects: Array<SavedObject<CasePersistedAttributes>>
    ) => handleExport({ context, objects, coreSetup, logger }),
  },
});
