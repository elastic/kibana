/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  SavedObjectsServiceSetup,
} from '@kbn/core/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';

import {
  SYNTHETICS_SECRET_ENCRYPTED_TYPE,
  syntheticsParamSavedObjectType,
} from './synthetics_param';
import { PRIVATE_LOCATIONS_SAVED_OBJECT_TYPE } from './private_locations';
import { DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES } from '../constants/settings';
import { DynamicSettingsAttributes } from '../runtime_types/settings';
import { ConfigKey } from '../../common/runtime_types';
import { UptimeConfig } from '../../common/config';
import { settingsObjectId, settingsObjectType } from './uptime_settings';
import {
  getSyntheticsMonitorSavedObjectType,
  SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
} from './synthetics_monitor';
import { syntheticsServiceApiKey } from './service_api_key';

export type UMSavedObjectsQueryFn<T = any, P = undefined> = (
  client: SavedObjectsClientContract,
  params?: P
) => Promise<T> | T;

export const registerUptimeSavedObjects = (
  savedObjectsService: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) => {
  savedObjectsService.registerType(PRIVATE_LOCATIONS_SAVED_OBJECT_TYPE);

  savedObjectsService.registerType(getSyntheticsMonitorSavedObjectType(encryptedSavedObjects));
  savedObjectsService.registerType(syntheticsServiceApiKey);
  savedObjectsService.registerType(syntheticsParamSavedObjectType);

  encryptedSavedObjects.registerType({
    type: syntheticsServiceApiKey.name, // 'uptime-synthetics-api-key'
    attributesToEncrypt: new Set(['apiKey']),
    // attributesToExcludeFromAAD: new Set([ConfigKey.ALERT_CONFIG]), // 'alert'
    // These all come from x-pack/plugins/synthetics/common/constants/monitor_management.ts
    attributesToIncludeInAAD: new Set([
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
      ConfigKey.METADATA,
      ConfigKey.MODE,
      ConfigKey.MONITOR_TYPE,
      ConfigKey.NAME,
      ConfigKey.NAMESPACE,
      ConfigKey.LOCATIONS,
      ConfigKey.PARAMS,
      ConfigKey.PASSWORD,
      ConfigKey.PLAYWRIGHT_OPTIONS,
      ConfigKey.ORIGINAL_SPACE,
      ConfigKey.PORT,
      ConfigKey.PROXY_URL,
      ConfigKey.PROXY_HEADERS,
      ConfigKey.PROXY_USE_LOCAL_RESOLVER,
      ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE,
      ConfigKey.RESPONSE_BODY_CHECK_POSITIVE,
      ConfigKey.RESPONSE_JSON_CHECK,
      ConfigKey.RESPONSE_BODY_INDEX,
      ConfigKey.RESPONSE_HEADERS_CHECK,
      ConfigKey.RESPONSE_HEADERS_INDEX,
      ConfigKey.RESPONSE_BODY_MAX_BYTES,
      ConfigKey.RESPONSE_RECEIVE_CHECK,
      ConfigKey.RESPONSE_STATUS_CHECK,
      ConfigKey.REQUEST_BODY_CHECK,
      ConfigKey.REQUEST_HEADERS_CHECK,
      ConfigKey.REQUEST_METHOD_CHECK,
      ConfigKey.REQUEST_SEND_CHECK,
      ConfigKey.REVISION,
      ConfigKey.SCHEDULE,
      ConfigKey.SCREENSHOTS,
      ConfigKey.SOURCE_PROJECT_CONTENT,
      ConfigKey.SOURCE_INLINE,
      ConfigKey.IPV4,
      ConfigKey.IPV6,
      ConfigKey.PROJECT_ID,
      ConfigKey.SYNTHETICS_ARGS,
      ConfigKey.TEXT_ASSERTION,
      ConfigKey.TLS_CERTIFICATE_AUTHORITIES,
      ConfigKey.TLS_CERTIFICATE,
      ConfigKey.TLS_KEY,
      ConfigKey.TLS_KEY_PASSPHRASE,
      ConfigKey.TLS_VERIFICATION_MODE,
      ConfigKey.TLS_VERSION,
      ConfigKey.TAGS,
      ConfigKey.TIMEOUT,
      ConfigKey.THROTTLING_CONFIG,
      ConfigKey.URLS,
      ConfigKey.USERNAME,
      ConfigKey.WAIT,
      ConfigKey.MONITOR_QUERY_ID,
    ]),
  });

  encryptedSavedObjects.registerType(SYNTHETICS_MONITOR_ENCRYPTED_TYPE);
  encryptedSavedObjects.registerType(SYNTHETICS_SECRET_ENCRYPTED_TYPE);
};

export interface UMSavedObjectsAdapter {
  config: UptimeConfig | null;
  getUptimeDynamicSettings: UMSavedObjectsQueryFn<DynamicSettingsAttributes>;
  setUptimeDynamicSettings: UMSavedObjectsQueryFn<void, DynamicSettingsAttributes>;
}

export const savedObjectsAdapter: UMSavedObjectsAdapter = {
  config: null,
  getUptimeDynamicSettings: async (client) => {
    try {
      const obj = await client.get<DynamicSettingsAttributes>(settingsObjectType, settingsObjectId);
      return obj?.attributes ?? DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES;
    } catch (getErr) {
      const config = savedObjectsAdapter.config;
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        if (config?.index) {
          return { ...DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES, heartbeatIndices: config.index };
        }
        return DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES;
      }
      throw getErr;
    }
  },
  setUptimeDynamicSettings: async (client, settings: DynamicSettingsAttributes | undefined) => {
    await client.create(settingsObjectType, settings, {
      id: settingsObjectId,
      overwrite: true,
    });
  },
};
