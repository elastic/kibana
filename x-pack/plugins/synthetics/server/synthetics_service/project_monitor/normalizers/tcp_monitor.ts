/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';
import {
  ConfigKey,
  DataStream,
  FormMonitorType,
  TCPFields,
} from '../../../../common/runtime_types/monitor_management';
import {
  NormalizedProjectProps,
  NormalizerResult,
  normalizeYamlConfig,
  getValueInSeconds,
  getNormalizeCommonFields,
  getOptionalArrayField,
  getOptionalListField,
  getMultipleUrlsOrHostsError,
  getUnsupportedKeysError,
} from './common_fields';

export const getNormalizeTCPFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
  version,
}: NormalizedProjectProps): NormalizerResult<TCPFields> => {
  const defaultFields = DEFAULT_FIELDS[DataStream.TCP];
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

  /* Check if monitor has multiple hosts */
  const hosts = getOptionalListField(monitor.hosts);
  if (hosts.length > 1) {
    errors.push(getMultipleUrlsOrHostsError(monitor, 'hosts', version));
  }

  if (unsupportedKeys.length) {
    errors.push(getUnsupportedKeysError(monitor, unsupportedKeys, version));
  }

  const normalizedFields = {
    ...yamlConfig,
    ...commonFields,
    [ConfigKey.MONITOR_TYPE]: DataStream.TCP,
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.TCP,
    [ConfigKey.HOSTS]:
      getOptionalArrayField(monitor[ConfigKey.HOSTS]) || defaultFields[ConfigKey.HOSTS],
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
    errors,
  };
};
