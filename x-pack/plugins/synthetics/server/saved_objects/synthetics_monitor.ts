/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { SyntheticsMonitorWithSecretsAttributes } from '../../common/runtime_types';
import { SyntheticsServerSetup } from '../types';
import { syntheticsMonitorType } from '../../common/types/saved_objects';
import { ConfigKey, LegacyConfigKey, secretKeys } from '../../common/constants/monitor_management';
import { monitorMigrations } from './migrations/monitors';

const attributesToIncludeInAAD = new Set([
  ConfigKey.APM_SERVICE_NAME,
  ConfigKey.CUSTOM_HEARTBEAT_ID,
  ConfigKey.CONFIG_ID,
  ConfigKey.CONFIG_HASH,
  ConfigKey.ENABLED,
  ConfigKey.FORM_MONITOR_TYPE,
  ConfigKey.HOSTS,
  ConfigKey.IGNORE_HTTPS_ERRORS,
  ConfigKey.MONITOR_SOURCE_TYPE,
  ConfigKey.JOURNEY_FILTERS_MATCH,
  ConfigKey.JOURNEY_FILTERS_TAGS,
  ConfigKey.JOURNEY_ID,
  ConfigKey.MAX_REDIRECTS,
  ConfigKey.MODE,
  ConfigKey.MONITOR_TYPE,
  ConfigKey.NAME,
  ConfigKey.NAMESPACE,
  ConfigKey.LOCATIONS,
  ConfigKey.PLAYWRIGHT_OPTIONS,
  ConfigKey.ORIGINAL_SPACE,
  ConfigKey.PORT,
  ConfigKey.PROXY_URL,
  ConfigKey.PROXY_USE_LOCAL_RESOLVER,
  ConfigKey.RESPONSE_BODY_INDEX,
  ConfigKey.RESPONSE_HEADERS_INDEX,
  ConfigKey.RESPONSE_BODY_MAX_BYTES,
  ConfigKey.RESPONSE_STATUS_CHECK,
  ConfigKey.REQUEST_METHOD_CHECK,
  ConfigKey.REVISION,
  ConfigKey.SCHEDULE,
  ConfigKey.SCREENSHOTS,
  ConfigKey.IPV4,
  ConfigKey.IPV6,
  ConfigKey.PROJECT_ID,
  ConfigKey.TEXT_ASSERTION,
  ConfigKey.TLS_CERTIFICATE_AUTHORITIES,
  ConfigKey.TLS_CERTIFICATE,
  ConfigKey.TLS_VERIFICATION_MODE,
  ConfigKey.TLS_VERSION,
  ConfigKey.TAGS,
  ConfigKey.TIMEOUT,
  ConfigKey.THROTTLING_CONFIG,
  ConfigKey.URLS,
  ConfigKey.WAIT,
  ConfigKey.MONITOR_QUERY_ID,
]);

export const LEGACY_SYNTHETICS_MONITOR_ENCRYPTED_TYPE = {
  type: syntheticsMonitorType,
  attributesToEncrypt: new Set([
    'secrets',
    /* adding secretKeys to the list of attributes to encrypt ensures
     * that secrets are never stored on the resulting saved object,
     * even in the presence of developer error.
     *
     * In practice, all secrets should be stored as a single JSON
     * payload on the `secrets` key. This ensures performant decryption. */
    ...secretKeys,
  ]),
  attributesToIncludeInAAD: new Set([
    LegacyConfigKey.SOURCE_ZIP_URL,
    LegacyConfigKey.SOURCE_ZIP_USERNAME,
    LegacyConfigKey.SOURCE_ZIP_PASSWORD,
    LegacyConfigKey.SOURCE_ZIP_FOLDER,
    LegacyConfigKey.SOURCE_ZIP_PROXY_URL,
    LegacyConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES,
    LegacyConfigKey.ZIP_URL_TLS_CERTIFICATE,
    LegacyConfigKey.ZIP_URL_TLS_KEY,
    LegacyConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE,
    LegacyConfigKey.ZIP_URL_TLS_VERIFICATION_MODE,
    LegacyConfigKey.ZIP_URL_TLS_VERSION,
    LegacyConfigKey.THROTTLING_CONFIG,
    LegacyConfigKey.IS_THROTTLING_ENABLED,
    LegacyConfigKey.DOWNLOAD_SPEED,
    LegacyConfigKey.UPLOAD_SPEED,
    LegacyConfigKey.LATENCY,
    ...attributesToIncludeInAAD,
  ]),
};

export const SYNTHETICS_MONITOR_ENCRYPTED_TYPE = {
  type: syntheticsMonitorType,
  attributesToEncrypt: new Set([
    'secrets',
    /* adding secretKeys to the list of attributes to encrypt ensures
     * that secrets are never stored on the resulting saved object,
     * even in the presence of developer error.
     *
     * In practice, all secrets should be stored as a single JSON
     * payload on the `secrets` key. This ensures performant decryption. */
    ...secretKeys,
  ]),
  attributesToIncludeInAAD,
};

export const getSyntheticsMonitorSavedObjectType = (
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectsType => {
  return {
    name: syntheticsMonitorType,
    hidden: false,
    namespaceType: 'single',
    migrations: {
      '8.6.0': monitorMigrations['8.6.0'](encryptedSavedObjects),
      '8.8.0': monitorMigrations['8.8.0'](encryptedSavedObjects),
      '8.9.0': monitorMigrations['8.9.0'](encryptedSavedObjects),
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
        hosts: {
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
          fields: {
            text: {
              type: 'text',
            },
          },
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
            label: {
              type: 'text',
            },
          },
        },
        custom_heartbeat_id: {
          type: 'keyword',
        },
        id: {
          type: 'keyword',
        },
        tags: {
          type: 'keyword',
          fields: {
            text: {
              type: 'text',
            },
          },
        },
        schedule: {
          properties: {
            number: {
              type: 'integer',
            },
          },
        },
        enabled: {
          type: 'boolean',
        },
        alert: {
          properties: {
            status: {
              properties: {
                enabled: {
                  type: 'boolean',
                },
              },
            },
            tls: {
              properties: {
                enabled: {
                  type: 'boolean',
                },
              },
            },
          },
        },
        throttling: {
          properties: {
            label: {
              type: 'keyword',
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
        i18n.translate('xpack.synthetics.syntheticsMonitors.label', {
          defaultMessage: 'Synthetics - Monitor',
        }),
    },
  };
};

export const getDecryptedMonitor = async (
  server: SyntheticsServerSetup,
  monitorId: string,
  spaceId: string
) => {
  const encryptedClient = server.encryptedSavedObjects.getClient();

  return await encryptedClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
    syntheticsMonitorType,
    monitorId,
    {
      namespace: spaceId,
    }
  );
};
