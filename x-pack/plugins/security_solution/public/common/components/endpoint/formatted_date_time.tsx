/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedDate, FormattedTime, FormattedRelative } from '@kbn/i18n/react';

export const FormattedDateAndTime: React.FC<{ date: Date; showRelativeTime?: boolean }> = ({
  date,
  showRelativeTime = false,
}) => {
  // If date is greater than or equal to 1h (ago), then show it as a date
  // and if showRelativeTime is false
  // else, show it as relative to "now"
  return Date.now() - date.getTime() >= 3.6e6 && !showRelativeTime ? (
    <>
      <FormattedDate value={date} year="numeric" month="short" day="2-digit" />
      {' @'}
      <FormattedTime value={date} />
    </>
  ) : (
    <>
      <FormattedRelative value={date} />
    </>
  );
};
