/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { Anomaly } from '../types';

export interface FromTo {
  from: number;
  to: number;
}

export const scoreIntervalToDateTime = (score: Anomaly, interval: string): FromTo => {
  if (interval === 'second' || interval === 'minute' || interval === 'hour') {
    return {
      from: moment(score.time).subtract(1, 'hour').valueOf(),
      to: moment(score.time).add(1, 'hour').valueOf(),
    };
  } else {
    // default should be a day
    return {
      from: moment(score.time).subtract(1, 'day').valueOf(),
      to: moment(score.time).add(1, 'day').valueOf(),
    };
  }
};
