/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NormalizedProjectProps } from './browser_monitor';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';
import { normalizeYamlConfig, getMonitorTimeout } from '.';

import {
  ConfigKey,
  DataStream,
  FormMonitorType,
  TCPFields,
} from '../../../../common/runtime_types/monitor_management';
import { getNormalizeCommonFields } from './common_fields';

export const getNormalizeTCPFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
}: NormalizedProjectProps): { normalizedFields: TCPFields; unsupportedKeys: string[] } => {
  const defaultFields = DEFAULT_FIELDS[DataStream.TCP];
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
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.TCP,
    [ConfigKey.HOSTS]: monitor[ConfigKey.HOSTS] || defaultFields[ConfigKey.HOSTS],
    [ConfigKey.TIMEOUT]: monitor.timeout
      ? getMonitorTimeout(monitor.timeout)
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
