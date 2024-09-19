/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { DATE_STRING_FORMAT } from '../types';

export const dateString = (inputString: string, tz: string): string => {
  if (inputString == null) {
    throw new Error('Invalid date string!');
  }
  let returnString: string;
  if (tz === 'Browser') {
    returnString = moment.utc(inputString).tz(moment.tz.guess()).format(DATE_STRING_FORMAT);
  } else {
    returnString = moment(inputString).tz(tz).format(DATE_STRING_FORMAT);
  }

  return returnString;
};
