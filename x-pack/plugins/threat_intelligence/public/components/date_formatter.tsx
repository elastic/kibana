/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { VFC } from 'react';
import { EMPTY_VALUE } from '../constants/common';
import { dateFormatter } from '../utils/dates';
import { useDateFormat, useTimeZone } from '../hooks/use_kibana_ui_settings';

moment.suppressDeprecationWarnings = true;

export interface DateFormatterProps {
  date: string | moment.Moment;
  dateFormat?: string;
}

export const DateFormatter: VFC<DateFormatterProps> = ({ date, dateFormat }) => {
  const userTimeZone = useTimeZone();
  const userFormat = useDateFormat();

  if (date === null) return <>{EMPTY_VALUE}</>;

  const momentDate: moment.Moment = typeof date === 'string' ? moment(date) : date;
  return <>{dateFormatter(momentDate, userTimeZone, dateFormat || userFormat)}</>;
};
