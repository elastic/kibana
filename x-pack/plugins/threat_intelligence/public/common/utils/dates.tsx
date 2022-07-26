/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
moment.suppressDeprecationWarnings = true;
import { EMPTY_VALUE } from '../../../common/constants';

export const dateFormatter = (
  date: string | moment.Moment,
  timeZone: string,
  format?: string
): string => {
  const momentDate: moment.Moment =
    typeof date === 'string' ? moment.tz(date, timeZone) : date.tz(timeZone);
  return momentDate.isValid() ? momentDate.format(format) : EMPTY_VALUE;
};
