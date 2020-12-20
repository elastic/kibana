/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IUiSettingsClient } from 'kibana/public';
import moment from 'moment';

export const dateString = (inputString: string, uiSettings: IUiSettingsClient): string => {
  if (inputString == null) {
    throw new Error('Invalid date string!');
  }
  const format = 'D MMM, YYYY, HH:mm:ss';
  const tz: string = uiSettings.get('dateFormat:tz');
  let returnString: string;
  if (tz === 'Browser') {
    returnString = moment.utc(inputString).tz(moment.tz.guess()).format(format);
  } else {
    returnString = moment(inputString).tz(tz).format(format);
  }

  return returnString;
};
