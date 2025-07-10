/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { getNextEnvironmentUrlParam } from '../../../../../common/environment_filter_values';
import type { Transaction as ITransaction } from '../../../../../typings/es_schemas/ui/transaction';
import { TransactionDetailLink } from '../../../shared/links/apm/transaction_detail_link';
import type { IWaterfall } from './waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import type { Environment } from '../../../../../common/environment_rt';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { getComparisonEnabled } from '../../../shared/time_comparison/get_comparison_enabled';

function FullTraceButton({ isLoading, isDisabled }: { isLoading?: boolean; isDisabled?: boolean }) {
  return (
    <EuiButton
      data-test-subj="apmFullTraceButtonViewFullTraceButton"
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
    '/mobile-services/{serviceName}/transactions/view',
    '/traces/explorer',
    '/dependencies/operation'
  );

  const { link } = useApmRouter();
  const { core } = useApmPluginContext();

  const defaultComparisonEnabled = getComparisonEnabled({
    core,
    urlComparisonEnabled: comparisonEnabled,
  });

  const latencyAggregationType =
    ('latencyAggregationType' in query && query.latencyAggregationType) ||
    LatencyAggregationType.avg;

  if (isLoading || !transaction) {
    return <FullTraceButton isLoading={isLoading} />;
  }

  const { rootWaterfallTransaction } = waterfall;
  // the traceroot cannot be found, so we cannot link to it
  if (!rootWaterfallTransaction) {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.apm.transactionDetails.noTraceParentButtonTooltip', {
          defaultMessage: 'The trace parent cannot be found',
        })}
      >
        <FullTraceButton isDisabled />
      </EuiToolTip>
    );
  }

  const rootTransaction = rootWaterfallTransaction.doc;
  const isRoot = transaction.transaction.id === rootWaterfallTransaction.id;
  const nextEnvironment = getNextEnvironmentUrlParam({
    requestedEnvironment: rootTransaction.service.environment,
    currentEnvironmentUrlParam: environment,
  });

  // the user is already viewing the full trace, so don't link to it
  if (isRoot) {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.apm.transactionDetails.viewingFullTraceButtonTooltip', {
          defaultMessage: 'Currently viewing the full trace',
        })}
      >
        <FullTraceButton isDisabled />
      </EuiToolTip>
    );

    // the user is viewing a zoomed in version of the trace. Link to the full trace
  } else {
    return (
      <TransactionDetailLink
        transactionName={rootTransaction.transaction.name}
        href={link('/services/{serviceName}/transactions/view', {
          path: { serviceName: rootTransaction.service.name },
          query: {
            ...query,
            latencyAggregationType,
            traceId: rootTransaction.trace.id,
            transactionId: rootTransaction.transaction.id,
            transactionName: rootTransaction.transaction.name,
            transactionType: rootTransaction.transaction.type,
            comparisonEnabled: defaultComparisonEnabled,
            offset,
            environment: nextEnvironment,
            serviceGroup: '',
          },
        })}
      >
        <FullTraceButton />
      </TransactionDetailLink>
    );
  }
}
