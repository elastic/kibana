/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import { FormattedDate as ReactIntlFormattedDate } from '@kbn/i18n/react';

export const FormattedDate = memo(({ timestamp }: { timestamp: number }) => {
  const date = new Date(timestamp);
  return (
    <ReactIntlFormattedDate
      value={date}
      year="numeric"
      month="2-digit"
      day="2-digit"
      hour="2-digit"
      minute="2-digit"
      second="2-digit"
    />
  );
});
