/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { monitorMigrations } from './migrations/monitors';

export const syntheticsMonitorType = 'synthetics-monitor';

export const getSyntheticsMonitorSavedObjectType = (
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectsType => {
  return {
    name: syntheticsMonitorType,
    hidden: false,
    namespaceType: 'single',
    migrations: {
      '8.6.0': monitorMigrations['8.6.0'](encryptedSavedObjects),
    },
    mappings: {
      dynamic: false,
      properties: {
        name: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
              normalizer: 'lowercase',
            },
          },
        },
        type: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
            },
          },
        },
        urls: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
            },
          },
        },
        journey_id: {
          type: 'keyword',
        },
        project_id: {
          type: 'keyword',
        },
        origin: {
          type: 'keyword',
        },
        hash: {
          type: 'keyword',
        },
        locations: {
          properties: {
            id: {
              type: 'keyword',
              ignore_above: 256,
              fields: {
                text: {
                  type: 'text',
                },
              },
            },
          },
        },
        custom_heartbeat_id: {
          type: 'keyword',
        },
        tags: {
          type: 'keyword',
        },
        schedule: {
          properties: {
            number: {
              type: 'integer',
            },
          },
        },
      },
    },
    management: {
      importableAndExportable: false,
      icon: 'uptimeApp',
      getTitle: (savedObject) =>
        savedObject.attributes.name +
        ' - ' +
        i18n.translate('xpack.synthetics.syntheticsMonitors', {
          defaultMessage: 'Uptime - Monitor',
        }),
    },
  };
};
