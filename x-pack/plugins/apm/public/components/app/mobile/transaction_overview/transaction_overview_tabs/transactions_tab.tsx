/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { TabContentProps } from '.';
import { TransactionsTable } from '../../../../shared/transactions_table';

function TransactionsTab({ environment, kuery, start, end }: TabContentProps) {
  return (
    <TransactionsTable
      hideTitle
      hideViewTransactionsLink
      numberOfTransactionsPerPage={25}
      showMaxTransactionGroupsExceededWarning
      environment={environment}
      kuery={kuery}
      start={start}
      end={end}
      saveTableOptionsToUrl
    />
  );
}

export const transactionsTab = {
  dataTestSubj: 'apmTransactionsTab',
  key: 'transactions',
  label: i18n.translate(
    'xpack.apm.mobile.transactions.overview.tabs.transactions',
    {
      defaultMessage: 'Transactions',
    }
  ),
  component: TransactionsTab,
};
