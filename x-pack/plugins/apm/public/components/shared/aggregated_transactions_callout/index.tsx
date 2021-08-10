/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function AggregatedTransactionsCallout() {
  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.apm.useAggregatedTransactions.callout.title',
        {
          defaultMessage:
            'No metrics events were found in the current time range so transaction events are used to display data instead',
        }
      )}
      iconType="iInCircle"
    >
      <p>
        {i18n.translate('xpack.apm.useAggregatedTransactions.callout.content', {
          defaultMessage: `This page is using data only from raw transaction events instead of aggregated transaction metrics.`,
        })}
      </p>
    </EuiCallOut>
  );
}
