/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsErrorHelpers,
  SavedObjectsServiceSetup,
} from '../../../../../../src/core/server';
import { EncryptedSavedObjectsPluginSetup } from '../../../../encrypted_saved_objects/server';

import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants';
import { DynamicSettings, ConfigKey } from '../../../common/runtime_types';
import { UMSavedObjectsQueryFn } from '../adapters';
import { UptimeConfig } from '../../../common/config';
import { settingsObjectId, umDynamicSettings } from './uptime_settings';
import { syntheticsMonitor } from './synthetics_monitor';
import { syntheticsServiceApiKey } from './service_api_key';

export const registerUptimeSavedObjects = (
  savedObjectsService: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  isServiceEnabled: boolean
) => {
  savedObjectsService.registerType(umDynamicSettings);

  if (isServiceEnabled) {
    savedObjectsService.registerType(syntheticsMonitor);
    savedObjectsService.registerType(syntheticsServiceApiKey);

    encryptedSavedObjects.registerType({
      type: syntheticsServiceApiKey.name,
      attributesToEncrypt: new Set(['apiKey']),
    });
    encryptedSavedObjects.registerType({
      type: syntheticsMonitor.name,
      attributesToEncrypt: new Set([
        ConfigKey.HOSTS,
        ConfigKey.LOCATIONS,
        ConfigKey.PASSWORD,
        ConfigKey.PROXY_URL,
        ConfigKey.PROXY_USE_LOCAL_RESOLVER,
        ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE,
        ConfigKey.RESPONSE_BODY_CHECK_POSITIVE,
        ConfigKey.RESPONSE_HEADERS_CHECK,
        ConfigKey.RESPONSE_RECEIVE_CHECK,
        ConfigKey.RESPONSE_STATUS_CHECK,
        ConfigKey.REQUEST_BODY_CHECK,
        ConfigKey.REQUEST_HEADERS_CHECK,
        ConfigKey.REQUEST_METHOD_CHECK,
        ConfigKey.REQUEST_SEND_CHECK,
        ConfigKey.SOURCE_INLINE,
        ConfigKey.SOURCE_ZIP_URL,
        ConfigKey.SOURCE_ZIP_USERNAME,
        ConfigKey.SOURCE_ZIP_PASSWORD,
        ConfigKey.SOURCE_ZIP_FOLDER,
        ConfigKey.SOURCE_ZIP_PROXY_URL,
        ConfigKey.TAGS,
        ConfigKey.TLS_CERTIFICATE_AUTHORITIES,
        ConfigKey.TLS_CERTIFICATE,
        ConfigKey.TLS_KEY,
        ConfigKey.TLS_KEY_PASSPHRASE,
        ConfigKey.URLS,
        ConfigKey.USERNAME,
        ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES,
        ConfigKey.ZIP_URL_TLS_CERTIFICATE,
        ConfigKey.ZIP_URL_TLS_KEY,
        ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE,
      ]),
    });
  }
};

export interface UMSavedObjectsAdapter {
  config: UptimeConfig | null;
  getUptimeDynamicSettings: UMSavedObjectsQueryFn<DynamicSettings>;
  setUptimeDynamicSettings: UMSavedObjectsQueryFn<void, DynamicSettings>;
}

export const savedObjectsAdapter: UMSavedObjectsAdapter = {
  config: null,
  getUptimeDynamicSettings: async (client) => {
    try {
      const obj = await client.get<DynamicSettings>(umDynamicSettings.name, settingsObjectId);
      return obj?.attributes ?? DYNAMIC_SETTINGS_DEFAULTS;
    } catch (getErr) {
      const config = savedObjectsAdapter.config;
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        if (config?.index) {
          return { ...DYNAMIC_SETTINGS_DEFAULTS, heartbeatIndices: config.index };
        }
        return DYNAMIC_SETTINGS_DEFAULTS;
      }
      throw getErr;
    }
  },
  setUptimeDynamicSettings: async (client, settings) => {
    await client.create(umDynamicSettings.name, settings, {
      id: settingsObjectId,
      overwrite: true,
    });
  },
};
