/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NormalizedProjectProps } from './browser_monitor';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';

import {
  ConfigKey,
  DataStream,
  FormMonitorType,
  SourceType,
  TCPFields,
} from '../../../../common/runtime_types/monitor_management';
import { getNormalizeCommonFields } from './common_fields';

export const getNormalizeTCPFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
}: NormalizedProjectProps): TCPFields => {
  const defaultFields = DEFAULT_FIELDS[DataStream.TCP];

  const commonFields = getNormalizeCommonFields({
    locations,
    privateLocations,
    monitor,
    projectId,
    namespace,
  });

  const normalizedFields = {
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.SINGLE,
    [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,

    [ConfigKey.PROJECT_ID]: projectId,
    [ConfigKey.JOURNEY_ID]: monitor.id,
    [ConfigKey.CUSTOM_HEARTBEAT_ID]: `${monitor.id}-${projectId}-${namespace}`,
    [ConfigKey.TIMEOUT]: null,
    [ConfigKey.HOSTS]: monitor[ConfigKey.HOSTS] || defaultFields[ConfigKey.HOSTS],

    ...commonFields,
  };
  return {
    ...defaultFields,
    ...normalizedFields,
  };
};
