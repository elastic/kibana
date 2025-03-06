/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { EuiSelect } from '@elastic/eui';
import React from 'react';

export function TransactionTypeSelect({
  transactionType,
  transactionTypes,
  onChange,
}: {
  transactionType: string;
  transactionTypes: string[];
  onChange: (transactionType: string) => void;
}) {
  const options = transactionTypes.map((t) => ({ text: t, value: t }));

  return (
    <EuiSelect
      style={{ minWidth: 160 }}
      compressed
      data-test-subj="alertingFilterTransactionType"
      prepend={i18n.translate('xpack.apm.alertingVisualizations.transactionType.prepend', {
        defaultMessage: 'Transaction Type',
      })}
      onChange={(event) => onChange(event.target.value)}
      options={options}
      value={transactionType}
    />
  );
}
