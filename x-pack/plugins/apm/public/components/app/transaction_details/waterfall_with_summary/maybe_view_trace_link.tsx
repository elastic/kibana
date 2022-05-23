/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getNextEnvironmentUrlParam } from '../../../../../common/environment_filter_values';
import { Transaction as ITransaction } from '../../../../../typings/es_schemas/ui/transaction';
import { TransactionDetailLink } from '../../../shared/links/apm/transaction_detail_link';
import { IWaterfall } from './waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import { Environment } from '../../../../../common/environment_rt';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';

function FullTraceButton({
  isLoading,
  isDisabled,
}: {
  isLoading?: boolean;
  isDisabled?: boolean;
}) {
  return (
    <EuiButton
      fill
      iconType="apmTrace"
      isLoading={isLoading}
      disabled={isDisabled}
    >
      {i18n.translate('xpack.apm.transactionDetails.viewFullTraceButtonLabel', {
        defaultMessage: 'View full trace',
      })}
    </EuiButton>
  );
}

export function MaybeViewTraceLink({
  isLoading,
  transaction,
  waterfall,
  environment,
}: {
  isLoading: boolean;
  transaction?: ITransaction;
  waterfall: IWaterfall;
  environment: Environment;
}) {
  const {
    query,
    query: { comparisonEnabled, offset },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/traces/explorer'
  );

  const latencyAggregationType =
    ('latencyAggregationType' in query && query.latencyAggregationType) ||
    LatencyAggregationType.avg;

  if (isLoading || !transaction) {
    return <FullTraceButton isLoading={isLoading} />;
  }

  const { rootTransaction } = waterfall;
  // the traceroot cannot be found, so we cannot link to it
  if (!rootTransaction) {
    return (
      <EuiToolTip
        content={i18n.translate(
          'xpack.apm.transactionDetails.noTraceParentButtonTooltip',
          {
            defaultMessage: 'The trace parent cannot be found',
          }
        )}
      >
        <FullTraceButton isDisabled />
      </EuiToolTip>
    );
  }

  const isRoot = transaction.transaction.id === rootTransaction.transaction.id;

  // the user is already viewing the full trace, so don't link to it
  if (isRoot) {
    return (
      <EuiToolTip
        content={i18n.translate(
          'xpack.apm.transactionDetails.viewingFullTraceButtonTooltip',
          {
            defaultMessage: 'Currently viewing the full trace',
          }
        )}
      >
        <FullTraceButton isDisabled />
      </EuiToolTip>
    );

    // the user is viewing a zoomed in version of the trace. Link to the full trace
  } else {
    const nextEnvironment = getNextEnvironmentUrlParam({
      requestedEnvironment: rootTransaction?.service.environment,
      currentEnvironmentUrlParam: environment,
    });

    return (
      <TransactionDetailLink
        serviceName={rootTransaction.service.name}
        transactionId={rootTransaction.transaction.id}
        traceId={rootTransaction.trace.id}
        transactionName={rootTransaction.transaction.name}
        transactionType={rootTransaction.transaction.type}
        environment={nextEnvironment}
        latencyAggregationType={latencyAggregationType}
        comparisonEnabled={comparisonEnabled}
        offset={offset}
      >
        <FullTraceButton />
      </TransactionDetailLink>
    );
  }
}
