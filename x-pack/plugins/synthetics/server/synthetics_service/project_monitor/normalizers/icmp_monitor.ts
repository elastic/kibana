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
  ICMPFields,
} from '../../../../common/runtime_types/monitor_management';
import { normalizeYamlConfig, getValueInSeconds, getOptionalArrayField } from './common_fields';

export const getNormalizeICMPFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
}: NormalizedProjectProps): { normalizedFields: ICMPFields; unsupportedKeys: string[] } => {
  const defaultFields = DEFAULT_FIELDS[DataStream.ICMP];
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
    [ConfigKey.MONITOR_TYPE]: DataStream.ICMP,
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.ICMP,
    [ConfigKey.HOSTS]:
      getOptionalArrayField(monitor[ConfigKey.HOSTS]) || defaultFields[ConfigKey.HOSTS],
    [ConfigKey.TIMEOUT]: monitor.timeout
      ? getValueInSeconds(monitor.timeout)
      : defaultFields[ConfigKey.TIMEOUT],
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
  };
};
