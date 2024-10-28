/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { mergeWith, omit, omitBy } from 'lodash';
import { LocationsMap } from '../../../synthetics_service/project_monitor/normalizers/common_fields';
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
  ConfigKey.METADATA,
  ConfigKey.SOURCE_PROJECT_CONTENT,
  ConfigKey.PROJECT_ID,
  ConfigKey.JOURNEY_FILTERS_MATCH,
  ConfigKey.JOURNEY_FILTERS_TAGS,
  ConfigKey.MONITOR_SOURCE_TYPE,
];

type Result = MonitorFieldsResult & {
  url?: string;
  host?: string;
  inline_script?: string;
  ssl: Record<string, any>;
  response: Record<string, any>;
  check: Record<string, any>;
  locations: string[];
  private_locations: string[];
};

export const transformPublicKeys = (result: Result) => {
  let formattedResult = {
    ...result,
    ...formatLocations(result),
    [ConfigKey.PARAMS]: formatParams(result),
    retest_on_failure: (result[ConfigKey.MAX_ATTEMPTS] ?? 1) > 1,
    ...(result[ConfigKey.HOSTS] && { host: result[ConfigKey.HOSTS] }),
    ...(result[ConfigKey.URLS] && { url: result[ConfigKey.URLS] }),
  };
  if (formattedResult[ConfigKey.MONITOR_TYPE] === 'browser') {
    formattedResult = {
      ...formattedResult,
      ...(result[ConfigKey.SOURCE_INLINE] && { inline_script: result[ConfigKey.SOURCE_INLINE] }),
      [ConfigKey.PLAYWRIGHT_OPTIONS]: formatPWOptions(result),
    };
  } else {
    formattedResult.ssl = formatNestedFields(formattedResult, 'ssl');
    formattedResult.response = formatNestedFields(formattedResult, 'response');
    formattedResult.check = formatNestedFields(formattedResult, 'check');
    if (formattedResult[ConfigKey.MAX_REDIRECTS]) {
      formattedResult[ConfigKey.MAX_REDIRECTS] = Number(formattedResult[ConfigKey.MAX_REDIRECTS]);
    }
  }
  const res = omit(formattedResult, keysToOmit) as Result;

  return omitBy(
    res,
    (_, key) => key.startsWith('response.') || key.startsWith('ssl.') || key.startsWith('check.')
  );
};

export function mapSavedObjectToMonitor({
  monitor,
  internal = false,
}: {
  monitor: SavedObject<MonitorFields | EncryptedSyntheticsMonitor>;
  internal?: boolean;
}) {
  const result = {
    ...monitor.attributes,
    created_at: monitor.created_at,
    updated_at: monitor.updated_at,
  } as Result;
  if (internal) {
    return result;
  }
  return transformPublicKeys(result);
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

const formatLocations = (config: MonitorFields) => {
  const locMap = Object.entries(LocationsMap);
  const locations = config[ConfigKey.LOCATIONS]
    ?.filter((location) => location.isServiceManaged)
    .map((location) => {
      return locMap.find(([_key, value]) => value === location.id)?.[0] ?? location.id;
    });

  const privateLocations = config[ConfigKey.LOCATIONS]
    ?.filter((location) => !location.isServiceManaged)
    .map((location) => location.id);

  return {
    ...(locations && { locations }),
    ...(privateLocations && { private_locations: privateLocations }),
  };
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
  return {};
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
  return {};
};

// combine same nested fields into same object
const formatNestedFields = (
  config: MonitorFields | Record<string, any>,
  nestedKey: 'ssl' | 'response' | 'check' | 'request'
): Record<string, any> => {
  const nestedFields = Object.keys(config).filter((key) =>
    key.startsWith(`${nestedKey}.`)
  ) as ConfigKey[];
  const obj: Record<string, any> = {};

  nestedFields.forEach((key) => {
    const newKey = key.replace(`${nestedKey}.`, '');
    obj[newKey] = config[key];
    delete config[key];
  });

  if (nestedKey === 'check') {
    return {
      request: formatNestedFields(obj, 'request'),
      response: formatNestedFields(obj, 'response'),
    };
  }

  return obj;
};
