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
  MonitorFieldsResult,
} from '../../../../common/runtime_types';

const keysToOmit = [
  ConfigKey.URLS,
  ConfigKey.SOURCE_INLINE,
  ConfigKey.HOSTS,
  ConfigKey.CONFIG_HASH,
  ConfigKey.JOURNEY_ID,
  ConfigKey.FORM_MONITOR_TYPE,
  ConfigKey.MAX_ATTEMPTS,
  ConfigKey.MONITOR_SOURCE_TYPE,
];

type Result = MonitorFieldsResult & {
  url?: string;
  host?: string;
  inline_script?: string;
  ssl: Record<string, any>;
  response: Record<string, any>;
  check: Record<string, any>;
};

export const transformPublicKeys = (result: Result, ui?: boolean) => {
  if (ui) {
    return result;
  }
  const formattedResult = {
    ...result,
    [ConfigKey.PARAMS]: formatParams(result),
    [ConfigKey.PLAYWRIGHT_OPTIONS]: formatPWOptions(result),
    retest_on_failure: (result[ConfigKey.MAX_ATTEMPTS] ?? 1) > 1,
    url: result[ConfigKey.URLS] ? result[ConfigKey.URLS] : undefined,
    inline_script: result[ConfigKey.SOURCE_INLINE] ? result[ConfigKey.SOURCE_INLINE] : undefined,
    host: result[ConfigKey.HOSTS] ? result[ConfigKey.HOSTS] : undefined,
    ssl: formatNestedFields(result, 'ssl'),
    response: formatNestedFields(result, 'response'),
    check: formatNestedFields(result, 'check'),
  };
  const res = omit(formattedResult, keysToOmit) as Result;

  return omitBy(
    res,
    (value, key) =>
      key.startsWith('response.') || key.startsWith('ssl.') || key.startsWith('check.')
  );
};

export function mapSavedObjectToMonitor({
  monitor,
  ui = false,
}: {
  monitor: SavedObject<MonitorFields | EncryptedSyntheticsMonitor>;
  ui?: boolean;
}) {
  const result = {
    ...monitor.attributes,
    created_at: monitor.created_at,
    updated_at: monitor.updated_at,
  } as Result;
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

const formatParams = (config: MonitorFields) => {
  if (config[ConfigKey.PARAMS]) {
    try {
      return (config[ConfigKey.PARAMS] = JSON.parse(config[ConfigKey.PARAMS] ?? '{}'));
    } catch (e) {
      // ignore
      return {};
    }
  }
};

const formatPWOptions = (config: MonitorFields) => {
  if (config[ConfigKey.PLAYWRIGHT_OPTIONS]) {
    try {
      return (config[ConfigKey.PLAYWRIGHT_OPTIONS] = JSON.parse(
        config[ConfigKey.PLAYWRIGHT_OPTIONS] ?? '{}'
      ));
    } catch (e) {
      // ignore
      return {};
    }
  }
};

// combine same nested fields into same object
const formatNestedFields = (config: MonitorFields, nestedKey: 'ssl' | 'response' | 'check') => {
  const nestedFields = Object.keys(config).filter((key) =>
    key.startsWith(`${nestedKey}.`)
  ) as ConfigKey[];
  const obj: Record<string, any> = {};

  nestedFields.forEach((key) => {
    const newKey = key.replace(`${nestedKey}.`, '');
    obj[newKey] = config[key];
    delete config[key];
  });

  return obj;
};
