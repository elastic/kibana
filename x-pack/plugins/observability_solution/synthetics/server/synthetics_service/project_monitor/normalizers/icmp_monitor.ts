/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';
import {
  ConfigKey,
  MonitorTypeEnum,
  FormMonitorType,
  ICMPFields,
} from '../../../../common/runtime_types/monitor_management';
import {
  NormalizerResult,
  NormalizedProjectProps,
  normalizeYamlConfig,
  getNormalizeCommonFields,
  getValueInSeconds,
  getOptionalArrayField,
  getOptionalListField,
  getInvalidUrlsOrHostsError,
  getUnsupportedKeysError,
} from './common_fields';

export const getNormalizeICMPFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
  version,
}: NormalizedProjectProps): NormalizerResult<ICMPFields> => {
  const defaultFields = DEFAULT_FIELDS[MonitorTypeEnum.ICMP];
  const errors = [];
  const { yamlConfig, unsupportedKeys } = normalizeYamlConfig(monitor);

  const { errors: commonErrors, normalizedFields: commonFields } = getNormalizeCommonFields({
    locations,
    privateLocations,
    monitor,
    projectId,
    namespace,
    version,
  });

  // Add common erros to errors arary
  errors.push(...commonErrors);

  /* Check if monitor has multiple hosts */
  const hosts = getOptionalListField(monitor.hosts);
  if (hosts.length !== 1) {
    errors.push(getInvalidUrlsOrHostsError(monitor, 'hosts', version));
  }

  if (unsupportedKeys.length) {
    errors.push(getUnsupportedKeysError(monitor, unsupportedKeys, version));
  }

  const normalizedFields = {
    ...yamlConfig,
    ...commonFields,
    [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.ICMP,
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.ICMP,
    [ConfigKey.HOSTS]:
      getOptionalArrayField(monitor[ConfigKey.HOSTS]) || defaultFields[ConfigKey.HOSTS],
    [ConfigKey.WAIT]: monitor.wait
      ? getValueInSeconds(monitor.wait) || defaultFields[ConfigKey.WAIT]
      : defaultFields[ConfigKey.WAIT],
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
