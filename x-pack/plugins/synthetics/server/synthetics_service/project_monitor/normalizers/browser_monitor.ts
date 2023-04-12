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
} from '../../../../common/runtime_types';
import {
  CONNECTION_PROFILE_VALUES,
  DEFAULT_FIELDS,
  PROFILES_MAP,
} from '../../../../common/constants/monitor_defaults';
import {
  NormalizedProjectProps,
  NormalizerResult,
  getNormalizeCommonFields,
  getValueInSeconds,
} from './common_fields';

export const getNormalizeBrowserFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
  version,
}: NormalizedProjectProps): NormalizerResult<BrowserFields> => {
  const defaultFields = DEFAULT_FIELDS[DataStream.BROWSER];

  const { errors, normalizedFields: commonFields } = getNormalizeCommonFields({
    locations,
    privateLocations,
    monitor,
    projectId,
    namespace,
    version,
  });

  let throttling = defaultFields[ConfigKey.THROTTLING_CONFIG];
  if (typeof monitor.throttling === 'boolean' && !monitor.throttling) {
    throttling = PROFILES_MAP[CONNECTION_PROFILE_VALUES.NO_THROTTLING];
  }

  const normalizedFields = {
    ...commonFields,
    [ConfigKey.MONITOR_TYPE]: DataStream.BROWSER,
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
    [ConfigKey.SOURCE_PROJECT_CONTENT]:
      monitor.content || defaultFields[ConfigKey.SOURCE_PROJECT_CONTENT],
    [ConfigKey.THROTTLING_CONFIG]: throttling,
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
    errors,
  };
};
