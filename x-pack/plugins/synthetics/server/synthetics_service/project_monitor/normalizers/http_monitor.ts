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

export const getNormalizeHTTPFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
}: NormalizedProjectProps): HTTPFields => {
  const defaultFields = DEFAULT_FIELDS[DataStream.HTTP];

  const commonFields = getNormalizeCommonFields({
    locations,
    privateLocations,
    monitor,
    projectId,
    namespace,
  });

  const normalizedFields = {
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.SINGLE,
    [ConfigKey.URLS]: monitor.urls?.[0] || defaultFields[ConfigKey.URLS],
    [ConfigKey.MAX_REDIRECTS]:
      monitor[ConfigKey.MAX_REDIRECTS] || defaultFields[ConfigKey.MAX_REDIRECTS],

    [ConfigKey.TIMEOUT]: null,
    ...commonFields,
  };
  return {
    ...defaultFields,
    ...normalizedFields,
  };
};
