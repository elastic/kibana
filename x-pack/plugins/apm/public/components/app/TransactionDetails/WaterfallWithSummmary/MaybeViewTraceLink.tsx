/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getNextEnvironmentUrlParam } from '../../../../../common/environment_filter_values';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { Transaction as ITransaction } from '../../../../../typings/es_schemas/ui/transaction';
import { TransactionDetailLink } from '../../../shared/Links/apm/transaction_detail_link';
import { IWaterfall } from './WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

export const MaybeViewTraceLink = ({
  transaction,
  waterfall,
}: {
  transaction: ITransaction;
  waterfall: IWaterfall;
}) => {
  const {
    urlParams: { environment, latencyAggregationType },
  } = useUrlParams();

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
    const nextEnvironment = getNextEnvironmentUrlParam({
      requestedEnvironment: rootTransaction?.service.environment,
      currentEnvironmentUrlParam: environment,
    });

    return (
      <EuiFlexItem grow={false}>
        <TransactionDetailLink
          serviceName={rootTransaction.service.name}
          transactionId={rootTransaction.transaction.id}
          traceId={rootTransaction.trace.id}
          transactionName={rootTransaction.transaction.name}
          transactionType={rootTransaction.transaction.type}
          environment={nextEnvironment}
          latencyAggregationType={latencyAggregationType}
        >
          <EuiButton iconType="apmTrace">{viewFullTraceButtonLabel}</EuiButton>
        </TransactionDetailLink>
      </EuiFlexItem>
    );
  }
};
