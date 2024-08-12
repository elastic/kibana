/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { mergeWith, omit } from 'lodash';
import {
  ConfigKey,
  EncryptedSyntheticsMonitor,
  MonitorFields,
} from '../../../common/runtime_types';

const keysToOmit = [
  ConfigKey.URLS,
  ConfigKey.SOURCE_INLINE,
  ConfigKey.HOSTS,
  ConfigKey.CONFIG_HASH,
  ConfigKey.JOURNEY_ID,
  ConfigKey.FORM_MONITOR_TYPE,
];

type Result = MonitorFields & { url?: string; host?: string; inline_script?: string };

export const transformPublicKeys = (result: Result, ui?: boolean) => {
  if (result[ConfigKey.URLS]) {
    result.url = result[ConfigKey.URLS];
  }
  if (result[ConfigKey.SOURCE_INLINE]) {
    result.inline_script = result[ConfigKey.SOURCE_INLINE];
  }
  if (result[ConfigKey.HOSTS]) {
    result.host = result[ConfigKey.HOSTS];
  }
  if (result[ConfigKey.PARAMS]) {
    try {
      result[ConfigKey.PARAMS] = JSON.parse(result[ConfigKey.PARAMS] ?? '{}');
    } catch (e) {
      // ignore
    }
  }
  if (result[ConfigKey.PLAYWRIGHT_OPTIONS]) {
    try {
      result[ConfigKey.PLAYWRIGHT_OPTIONS] = JSON.parse(
        result[ConfigKey.PLAYWRIGHT_OPTIONS] ?? '{}'
      );
    } catch (e) {
      // ignore
    }
  }
  if (ui) {
    return result;
  }
  return omit(result, keysToOmit) as Result;
};

export function mapSavedObjectToMonitor({
  monitor,
  ui = false,
}: {
  monitor: SavedObject<MonitorFields | EncryptedSyntheticsMonitor>;
  ui?: boolean;
}) {
  const result = Object.assign(monitor.attributes, {
    created_at: monitor.created_at,
    updated_at: monitor.updated_at,
  }) as Result;
  return transformPublicKeys(result, ui);
}
export function mergeSourceMonitor(
  normalizedPreviousMonitor: EncryptedSyntheticsMonitor,
  monitor: EncryptedSyntheticsMonitor
) {
  return mergeWith({ ...normalizedPreviousMonitor }, monitor, customizer);
}

// Ensure that METADATA is merged deeply, to protect AAD and prevent decryption errors
const customizer = (destVal: any, srcValue: any, key: string) => {
  if (key === ConfigKey.ALERT_CONFIG) {
    return { ...destVal, ...srcValue };
  }
  if (key !== ConfigKey.METADATA) {
    return srcValue;
  }
};
