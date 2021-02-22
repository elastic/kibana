/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedDate, FormattedTime } from '@kbn/i18n/react';

interface Props {
  date: Date;
  hasTime?: boolean;
}

export const FormattedDateTime: React.FC<Props> = ({ date, hasTime = true }) => (
  <>
    <FormattedDate value={date} year="numeric" month="short" day="numeric" />
    {hasTime && (
      <>
        {' '}
        <FormattedTime value={date} />
      </>
    )}
  </>
);
