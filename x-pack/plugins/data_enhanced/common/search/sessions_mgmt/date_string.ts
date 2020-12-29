/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IUiSettingsClient } from 'kibana/public';
import moment from 'moment';
import { DATE_STRING_FORMAT } from './constants';

export const dateString = (inputString: string, uiSettings: IUiSettingsClient): string => {
  if (inputString == null) {
    throw new Error('Invalid date string!');
  }
  const tz: string = uiSettings.get('dateFormat:tz');
  let returnString: string;
  if (tz === 'Browser') {
    returnString = moment.utc(inputString).tz(moment.tz.guess()).format(DATE_STRING_FORMAT);
  } else {
    returnString = moment(inputString).tz(tz).format(DATE_STRING_FORMAT);
  }

  return returnString;
};
