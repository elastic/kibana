/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
moment.suppressDeprecationWarnings = true;
import { EMPTY_VALUE } from '../../../common/constants';

const FULL_DATE = 'MMMM Do YYYY @ HH:mm:ss';

export const fullDateFormatter = (date: string | moment.Moment): string => {
  const momentDate: moment.Moment = typeof date === 'string' ? moment(date) : date;
  return momentDate.isValid() ? momentDate.format(FULL_DATE) : EMPTY_VALUE;
};
