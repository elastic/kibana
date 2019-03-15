/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React from 'react';
import { WithKibanaChrome } from '../containers/with_kibana_chrome';

interface FormattedTimeProps {
  time: number; // Unix time (milliseconds)
  fallbackFormat?: string;
}

const getFormattedTime = (
  time: FormattedTimeProps['time'],
  userFormat: string | undefined,
  fallbackFormat: string = 'Y-MM-DD HH:mm:ss.SSS'
) => {
  return userFormat ? moment(time).format(userFormat) : moment(time).format(fallbackFormat);
};

export const FormattedTime: React.SFC<FormattedTimeProps> = ({ time, fallbackFormat }) => (
  <WithKibanaChrome>
    {({ dateFormat }) => <span>{getFormattedTime(time, dateFormat, fallbackFormat)}</span>}
  </WithKibanaChrome>
);
