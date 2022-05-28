/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedRelative } from '@kbn/i18n-react';

import { FormattedDateTime } from '../../../utils/formatted_date_time';

interface CustomFormattedTimestampProps {
  timestamp: string;
}

export const CustomFormattedTimestamp: React.FC<CustomFormattedTimestampProps> = ({
  timestamp,
}) => {
  const date = new Date(timestamp);
  const isDateToday = date >= new Date(new Date(Date.now()).toDateString());
  return isDateToday ? (
    <FormattedRelative value={date} />
  ) : (
    <FormattedDateTime date={date} hideTime />
  );
};
