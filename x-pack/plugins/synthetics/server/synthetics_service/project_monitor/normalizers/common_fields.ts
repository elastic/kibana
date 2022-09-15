/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CommonFields,
  ConfigKey,
  DataStream,
  ScheduleUnit,
  SourceType,
} from '../../../../common/runtime_types';
import { DEFAULT_COMMON_FIELDS } from '../../../../common/constants/monitor_defaults';
import { getMonitorLocations, NormalizedProjectProps } from '.';

export const getNormalizeCommonFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
}: NormalizedProjectProps): CommonFields => {
  const defaultFields = DEFAULT_COMMON_FIELDS;

  const normalizedFields = {
    [ConfigKey.JOURNEY_ID]: monitor.id || defaultFields[ConfigKey.JOURNEY_ID],
    [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,
    [ConfigKey.NAME]: monitor.name || '',
    [ConfigKey.SCHEDULE]: {
      number: `${monitor.schedule}`,
      unit: ScheduleUnit.MINUTES,
    },
    [ConfigKey.PROJECT_ID]: projectId,
    [ConfigKey.LOCATIONS]: getMonitorLocations({
      monitor,
      privateLocations,
      publicLocations: locations,
    }),
    [ConfigKey.APM_SERVICE_NAME]:
      monitor.apmServiceName || defaultFields[ConfigKey.APM_SERVICE_NAME],
    [ConfigKey.TAGS]: monitor.tags || defaultFields[ConfigKey.TAGS],
    [ConfigKey.NAMESPACE]: namespace || defaultFields[ConfigKey.NAMESPACE],
    [ConfigKey.ORIGINAL_SPACE]: namespace || defaultFields[ConfigKey.NAMESPACE],
    [ConfigKey.CUSTOM_HEARTBEAT_ID]: getCustomHeartbeatId(monitor, projectId, namespace, false),
    [ConfigKey.ENABLED]: monitor.enabled ?? defaultFields[ConfigKey.ENABLED],
  };
  return {
    ...defaultFields,
    ...normalizedFields,
  };
};

export const getCustomHeartbeatId = (
  monitor: NormalizedProjectProps['monitor'],
  projectId: string,
  namespace: string,
  preserveMonitorId: boolean
) => {
  if (monitor.type !== DataStream.BROWSER && preserveMonitorId) {
    return monitor.id;
  }
  return `${monitor.id}-${projectId}-${namespace}`;
};
