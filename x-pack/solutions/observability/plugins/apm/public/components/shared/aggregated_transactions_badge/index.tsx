/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function AggregatedTransactionsBadge() {
  return (
    <div>
      <EuiToolTip
        content={i18n.translate('xpack.apm.aggregatedTransactions.fallback.tooltip', {
          defaultMessage: `This page is using transaction event data as no metric events were found in the current time range, or a filter has been applied based on fields that are not available in metric event documents.`,
        })}
      >
        <EuiBadge iconType="iInCircle" color="hollow">
          {i18n.translate('xpack.apm.aggregatedTransactions.fallback.badge', {
            defaultMessage: `Based on sampled transactions`,
          })}
        </EuiBadge>
      </EuiToolTip>
    </div>
  );
}
