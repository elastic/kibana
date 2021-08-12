/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function AggregatedTransactionsCallout() {
  return (
    <EuiCallOut
      size="s"
      title={
        <EuiText size="xs">
          {i18n.translate('xpack.apm.aggregatedTransactions.callout.title', {
            defaultMessage: `This page is using transaction event data as no metrics events were found in the current time range.`,
          })}
        </EuiText>
      }
      iconType="iInCircle"
    />
  );
}
