/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';
import {
  ConfigKey,
  DataStream,
  FormMonitorType,
  HTTPFields,
  Mode,
  TLSVersion,
} from '../../../../common/runtime_types/monitor_management';
import {
  NormalizedProjectProps,
  NormalizerResult,
  getNormalizeCommonFields,
  normalizeYamlConfig,
  getOptionalListField,
  getOptionalArrayField,
  getUnsupportedKeysError,
  getInvalidUrlsOrHostsError,
} from './common_fields';

export const getNormalizeHTTPFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
  version,
}: NormalizedProjectProps): NormalizerResult<HTTPFields> => {
  const defaultFields = DEFAULT_FIELDS[DataStream.HTTP];
  const errors = [];
  const { yamlConfig, unsupportedKeys } = normalizeYamlConfig(monitor);
  const commonFields = getNormalizeCommonFields({
    locations,
    privateLocations,
    monitor,
    projectId,
    namespace,
    version,
  });

  /* Check if monitor has multiple urls */
  const urls = getOptionalListField(monitor.urls);
  if (urls.length !== 1) {
    errors.push(getInvalidUrlsOrHostsError(monitor, 'urls', version));
  }
  if (unsupportedKeys.length) {
    errors.push(getUnsupportedKeysError(monitor, unsupportedKeys, version));
  }

  const normalizedFields = {
    ...yamlConfig,
    ...commonFields,
    [ConfigKey.MONITOR_TYPE]: DataStream.HTTP,
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.HTTP,
    [ConfigKey.URLS]: getOptionalArrayField(monitor.urls) || defaultFields[ConfigKey.URLS],
    [ConfigKey.MAX_REDIRECTS]:
      monitor[ConfigKey.MAX_REDIRECTS] || defaultFields[ConfigKey.MAX_REDIRECTS],
    [ConfigKey.REQUEST_BODY_CHECK]: getRequestBodyField(
      (yamlConfig as Record<keyof HTTPFields, unknown>)[ConfigKey.REQUEST_BODY_CHECK] as string,
      defaultFields[ConfigKey.REQUEST_BODY_CHECK]
    ),
    [ConfigKey.TLS_VERSION]: get(monitor, ConfigKey.TLS_VERSION)
      ? (getOptionalListField(get(monitor, ConfigKey.TLS_VERSION)) as TLSVersion[])
      : defaultFields[ConfigKey.TLS_VERSION],
  };
  return {
    normalizedFields: {
      ...defaultFields,
      ...normalizedFields,
    },
    unsupportedKeys,
    errors,
  };
};

export const getRequestBodyField = (
  value: string,
  defaultValue: HTTPFields[ConfigKey.REQUEST_BODY_CHECK]
): HTTPFields[ConfigKey.REQUEST_BODY_CHECK] => {
  let parsedValue: string;
  let type: Mode;

  if (typeof value === 'object') {
    parsedValue = JSON.stringify(value);
    type = Mode.JSON;
  } else {
    parsedValue = value;
    type = Mode.PLAINTEXT;
  }
  return {
    type,
    value: parsedValue || defaultValue.value,
  };
};
