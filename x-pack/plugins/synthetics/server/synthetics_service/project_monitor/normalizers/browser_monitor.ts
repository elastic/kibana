/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BrowserFields,
  ConfigKey,
  DataStream,
  FormMonitorType,
  Locations,
  PrivateLocation,
  ProjectMonitor,
} from '../../../../common/runtime_types';
import { getNormalizeCommonFields, getValueInSeconds } from './common_fields';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';

export interface NormalizedProjectProps {
  locations: Locations;
  privateLocations: PrivateLocation[];
  monitor: ProjectMonitor;
  projectId: string;
  namespace: string;
}

export const getNormalizeBrowserFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
}: NormalizedProjectProps): { normalizedFields: BrowserFields; unsupportedKeys: string[] } => {
  const defaultFields = DEFAULT_FIELDS[DataStream.BROWSER];

  const commonFields = getNormalizeCommonFields({
    locations,
    privateLocations,
    monitor,
    projectId,
    namespace,
  });

  const normalizedFields = {
    ...commonFields,
    [ConfigKey.MONITOR_TYPE]: DataStream.BROWSER,
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
    [ConfigKey.SOURCE_PROJECT_CONTENT]:
      monitor.content || defaultFields[ConfigKey.SOURCE_PROJECT_CONTENT],
    [ConfigKey.THROTTLING_CONFIG]: monitor.throttling
      ? `${monitor.throttling.download}d/${monitor.throttling.upload}u/${monitor.throttling.latency}l`
      : defaultFields[ConfigKey.THROTTLING_CONFIG],
    [ConfigKey.DOWNLOAD_SPEED]: `${
      monitor.throttling?.download || defaultFields[ConfigKey.DOWNLOAD_SPEED]
    }`,
    [ConfigKey.UPLOAD_SPEED]: `${
      monitor.throttling?.upload || defaultFields[ConfigKey.UPLOAD_SPEED]
    }`,
    [ConfigKey.IS_THROTTLING_ENABLED]:
      Boolean(monitor.throttling) || defaultFields[ConfigKey.IS_THROTTLING_ENABLED],
    [ConfigKey.LATENCY]: `${monitor.throttling?.latency || defaultFields[ConfigKey.LATENCY]}`,
    [ConfigKey.IGNORE_HTTPS_ERRORS]:
      monitor.ignoreHTTPSErrors || defaultFields[ConfigKey.IGNORE_HTTPS_ERRORS],
    [ConfigKey.SCREENSHOTS]: monitor.screenshot || defaultFields[ConfigKey.SCREENSHOTS],
    [ConfigKey.PLAYWRIGHT_OPTIONS]: Object.keys(monitor.playwrightOptions || {}).length
      ? JSON.stringify(monitor.playwrightOptions)
      : defaultFields[ConfigKey.PLAYWRIGHT_OPTIONS],
    [ConfigKey.PARAMS]: Object.keys(monitor.params || {}).length
      ? JSON.stringify(monitor.params)
      : defaultFields[ConfigKey.PARAMS],
    [ConfigKey.JOURNEY_FILTERS_MATCH]:
      monitor.filter?.match || defaultFields[ConfigKey.JOURNEY_FILTERS_MATCH],
    [ConfigKey.TIMEOUT]: monitor.timeout
      ? getValueInSeconds(monitor.timeout)
      : defaultFields[ConfigKey.TIMEOUT],
  };
  return {
    normalizedFields: {
      ...defaultFields,
      ...normalizedFields,
    },
    unsupportedKeys: [],
  };
};
