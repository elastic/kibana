/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TIME_UNITS as COMMON_TIME_UNITS } from 'plugins/watcher/../common/constants/time_units';

export const TIME_UNITS = {
  [COMMON_TIME_UNITS.SECOND]: {
    labelPlural: 'seconds',
    labelSingular: 'second'
  },
  [COMMON_TIME_UNITS.MINUTE]: {
    labelPlural: 'minutes',
    labelSingular: 'minute'
  },
  [COMMON_TIME_UNITS.HOUR]: {
    labelPlural: 'hours',
    labelSingular: 'hour'
  },
  [COMMON_TIME_UNITS.DAY]: {
    labelPlural: 'days',
    labelSingular: 'day'
  }
};
