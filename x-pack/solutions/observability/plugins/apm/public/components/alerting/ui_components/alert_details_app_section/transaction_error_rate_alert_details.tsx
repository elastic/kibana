/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AlertDetailsAppSection } from '.';
import type { AlertDetailsAppSectionProps } from './types';

export function TransactionErrorRateAlertDetails({
  rule,
  alert,
  timeZone,
}: AlertDetailsAppSectionProps) {
  return (
    <AlertDetailsAppSection
      rule={rule}
      alert={alert}
      timeZone={timeZone}
      mainChart="FailedTransactionChart"
    />
  );
}

// eslint-disable-next-line import/no-default-export
export default TransactionErrorRateAlertDetails;
