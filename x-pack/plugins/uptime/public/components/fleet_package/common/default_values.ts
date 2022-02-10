/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_NAMESPACE_STRING } from '../../../../common/constants';
import { CommonFields, ConfigKey, ScheduleUnit, DataStream } from '../types';

export const defaultValues: CommonFields = {
  [ConfigKey.MONITOR_TYPE]: DataStream.HTTP,
  [ConfigKey.LOCATIONS]: [],
  [ConfigKey.ENABLED]: true,
  [ConfigKey.SCHEDULE]: {
    number: '3',
    unit: ScheduleUnit.MINUTES,
  },
  [ConfigKey.APM_SERVICE_NAME]: '',
  [ConfigKey.TAGS]: [],
  [ConfigKey.TIMEOUT]: '16',
  [ConfigKey.NAME]: '',
  [ConfigKey.LOCATIONS]: [],
  [ConfigKey.NAMESPACE]: DEFAULT_NAMESPACE_STRING,
};
