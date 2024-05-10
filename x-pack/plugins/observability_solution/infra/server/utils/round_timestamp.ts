/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Unit } from '@kbn/datemath';
import moment from 'moment';

export const roundTimestamp = (timestamp: number, unit: Unit) => {
  const floor = moment(timestamp).startOf(unit).valueOf();
  const ceil = moment(timestamp).add(1, unit).startOf(unit).valueOf();
  if (Math.abs(timestamp - floor) <= Math.abs(timestamp - ceil)) return floor;
  return ceil;
};
