/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function OrphanTraceItemsWarning({
  orphanTraceItemsCount,
}: {
  orphanTraceItemsCount: number;
}) {
  return (
    <EuiToolTip
      position="left"
      content={i18n.translate(
        'xpack.apm.transactionDetails.agentMissingTransactionMessage',
        {
          defaultMessage:
            'This trace is incomplete and {itemsCount} items could not be displayed in the timeline. This could be a temporary problem caused by ingest delay, or a permanent problem caused by some events being dropped.',
          values: { itemsCount: orphanTraceItemsCount },
        }
      )}
      anchorClassName="eui-fullWidth"
    >
      <EuiBadge
        iconType="warning"
        color="hollow"
        data-test-id="apm-missing-transaction-badge"
      >
        {i18n.translate(
          'xpack.apm.transactionDetails.agentMissingTransactionLabel',
          {
            defaultMessage: 'Incomplete trace',
          }
        )}
      </EuiBadge>
    </EuiToolTip>
  );
}
