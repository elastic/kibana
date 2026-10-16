/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  transactionResult: string;
}

export interface TransactionResultBadgeDescriptor {
  label: string;
  color: 'default';
  toolTipContent: string;
}

/** Resolves the transaction result badge's label, color, and tooltip. */
export function getTransactionResultBadgeDescriptor(
  transactionResult: string
): TransactionResultBadgeDescriptor {
  return {
    label: transactionResult,
    color: 'default',
    toolTipContent: i18n.translate('xpack.apm.transactionDetails.resultLabel', {
      defaultMessage: 'Result',
    }),
  };
}

export function TransactionResultSummaryItem({ transactionResult }: Props) {
  const { label, color, toolTipContent } = getTransactionResultBadgeDescriptor(transactionResult);

  return (
    <EuiToolTip content={toolTipContent}>
      <EuiBadge color={color} title={undefined} tabIndex={0}>
        {label}
      </EuiBadge>
    </EuiToolTip>
  );
}
