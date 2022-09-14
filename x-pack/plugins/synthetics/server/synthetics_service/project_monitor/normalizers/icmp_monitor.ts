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

export const getNormalizeICMPFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
}: NormalizedProjectProps): ICMPFields => {
  const defaultFields = DEFAULT_FIELDS[DataStream.ICMP];

  const commonFields = getNormalizeCommonFields({
    locations,
    privateLocations,
    monitor,
    projectId,
    namespace,
  });

  const normalizedFields = {
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.SINGLE,

    [ConfigKey.PROJECT_ID]: projectId,
    [ConfigKey.JOURNEY_ID]: monitor.id,
    [ConfigKey.CUSTOM_HEARTBEAT_ID]: `${monitor.id}-${projectId}-${namespace}`,
    [ConfigKey.TIMEOUT]: null,
    ...commonFields,
  };
  return {
    ...defaultFields,
    ...normalizedFields,
  };
};
