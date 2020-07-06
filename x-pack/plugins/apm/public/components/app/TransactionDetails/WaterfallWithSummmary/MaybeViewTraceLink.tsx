/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Transaction as ITransaction } from '../../../../../typings/es_schemas/ui/transaction';
import { TransactionDetailLink } from '../../../shared/Links/apm/TransactionDetailLink';
import { IWaterfall } from './WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

export const MaybeViewTraceLink = ({
  transaction,
  waterfall,
}: {
  transaction: ITransaction;
  waterfall: IWaterfall;
}) => {
  const viewFullTraceButtonLabel = i18n.translate(
    'xpack.apm.transactionDetails.viewFullTraceButtonLabel',
    {
      defaultMessage: 'View full trace',
    }
  );

  const { rootTransaction } = waterfall;
  // the traceroot cannot be found, so we cannot link to it
  if (!rootTransaction) {
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.transactionDetails.noTraceParentButtonTooltip',
            {
              defaultMessage: 'The trace parent cannot be found',
            }
          )}
        >
          <EuiButton iconType="apmTrace" disabled={true}>
            {viewFullTraceButtonLabel}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    );
  }

  const isRoot = transaction.transaction.id === rootTransaction.transaction.id;

  // the user is already viewing the full trace, so don't link to it
  if (isRoot) {
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.transactionDetails.viewingFullTraceButtonTooltip',
            {
              defaultMessage: 'Currently viewing the full trace',
            }
          )}
        >
          <EuiButton iconType="apmTrace" disabled={true}>
            {viewFullTraceButtonLabel}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    );

    // the user is viewing a zoomed in version of the trace. Link to the full trace
  } else {
    return (
      <EuiFlexItem grow={false}>
        <TransactionDetailLink
          serviceName={rootTransaction.service.name}
          transactionId={rootTransaction.transaction.id}
          traceId={rootTransaction.trace.id}
          transactionName={rootTransaction.transaction.name}
          transactionType={rootTransaction.transaction.type}
        >
          <EuiButton iconType="apmTrace">{viewFullTraceButtonLabel}</EuiButton>
        </TransactionDetailLink>
      </EuiFlexItem>
    );
  }
};
