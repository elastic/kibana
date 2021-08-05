/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ICommonFields, ConfigKeys, ScheduleUnit, DataStream } from '../types';

export const defaultValues: ICommonFields = {
  [ConfigKeys.MONITOR_TYPE]: DataStream.HTTP,
  [ConfigKeys.SCHEDULE]: {
    number: '3',
    unit: ScheduleUnit.MINUTES,
  },
  [ConfigKeys.APM_SERVICE_NAME]: '',
  [ConfigKeys.TAGS]: [],
  [ConfigKeys.TIMEOUT]: '16',
};
