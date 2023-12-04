/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function MissingTransactionWarning() {
  return (
    <EuiToolTip
      position="left"
      content={i18n.translate(
        'xpack.apm.transactionDetails.agentMissingTransactionMessage',
        {
          defaultMessage:
            'This trace contains spans from missing transactions. As a result these spans are not displayed in the timeline.',
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
