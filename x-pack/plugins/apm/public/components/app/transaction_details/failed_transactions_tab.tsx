/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { ErrorCorrelations } from '../correlations/error_correlations';

export const failedTransactionsTab = {
  key: 'failedTransactions',
  label: i18n.translate(
    'xpack.apm.transactionDetails.tabs.failedTransactionsLabel',
    {
      defaultMessage: 'Failing transactions',
    }
  ),
  component: () => <ErrorCorrelations onClose={() => {}} />,
};
