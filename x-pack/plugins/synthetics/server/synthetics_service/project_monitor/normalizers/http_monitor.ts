/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getNormalizeCommonFields } from './common_fields';
import { NormalizedProjectProps } from './browser_monitor';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';
import {
  ConfigKey,
  DataStream,
  FormMonitorType,
  HTTPFields,
} from '../../../../common/runtime_types/monitor_management';
import { normalizeYamlConfig, getValueInSeconds, getOptionalArrayField } from './common_fields';

export const getNormalizeHTTPFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
}: NormalizedProjectProps): { normalizedFields: HTTPFields; unsupportedKeys: string[] } => {
  const defaultFields = DEFAULT_FIELDS[DataStream.HTTP];
  const { yamlConfig, unsupportedKeys } = normalizeYamlConfig(monitor);

  const commonFields = getNormalizeCommonFields({
    locations,
    privateLocations,
    monitor,
    projectId,
    namespace,
  });

  const normalizedFields = {
    ...yamlConfig,
    ...commonFields,
    [ConfigKey.MONITOR_TYPE]: DataStream.HTTP,
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.HTTP,
    [ConfigKey.URLS]: getOptionalArrayField(monitor.urls) || defaultFields[ConfigKey.URLS],
    [ConfigKey.MAX_REDIRECTS]:
      monitor[ConfigKey.MAX_REDIRECTS] || defaultFields[ConfigKey.MAX_REDIRECTS],
    [ConfigKey.TIMEOUT]: monitor.timeout
      ? getValueInSeconds(monitor.timeout)
      : defaultFields[ConfigKey.TIMEOUT],
  };
  return {
    normalizedFields: {
      ...defaultFields,
      ...normalizedFields,
    },
    unsupportedKeys,
  };
};
