/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { mergeWith, omit, omitBy } from 'lodash';
import {
  ConfigKey,
  EncryptedSyntheticsMonitor,
  MonitorFields,
} from '../../../common/runtime_types';

const keysToOmit = [
  ConfigKey.URLS,
  ConfigKey.HOSTS,
  ConfigKey.CONFIG_HASH,
  ConfigKey.JOURNEY_ID,
  ConfigKey.FORM_MONITOR_TYPE,
];

type Result = MonitorFields & { url?: string; host?: string };
export function mapSavedObjectToMonitor(
  so: SavedObject<MonitorFields | EncryptedSyntheticsMonitor>
) {
  let result = Object.assign(so.attributes, {
    created_at: so.created_at,
    updated_at: so.updated_at,
  }) as Result;
  if (result[ConfigKey.URLS]) {
    result.url = result[ConfigKey.URLS];
  }
  if (result[ConfigKey.HOSTS]) {
    result.host = result[ConfigKey.HOSTS];
  }
  result = omit(result, keysToOmit) as Result;
  // omit undefined value or null value
  return omitBy(result, removeMonitorEmptyValues);
}
export function mergeSourceMonitor(
  normalizedPreviousMonitor: EncryptedSyntheticsMonitor,
  monitor: EncryptedSyntheticsMonitor
) {
  return mergeWith(normalizedPreviousMonitor, monitor, customizer);
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

export const removeMonitorEmptyValues = (v: any) => {
  if (v === undefined || v === null) {
    return true;
  }
  if (typeof v === 'string' && v.trim() === '') {
    return true;
  }
  if (Array.isArray(v) && v.length === 0) {
    return true;
  }
  if (typeof v === 'object' && Object.keys(v).length === 0) {
    return true;
  }
  return false;
};
