/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import {
  ENVIRONMENT_NOT_DEFINED,
  getNextEnvironmentUrlParam,
} from '../../../../../common/environment_filter_values';
import type { Transaction as ITransaction } from '../../../../../typings/es_schemas/ui/transaction';
import { TransactionDetailLink } from '../../../shared/links/apm/transaction_detail_link';
import type { IWaterfall } from './waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import type { Environment } from '../../../../../common/environment_rt';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { getComparisonEnabled } from '../../../shared/time_comparison/get_comparison_enabled';
import type { TraceItem } from '../../../../../common/waterfall/unified_trace_item';
import { getTraceParentChildrenMap } from '../../../shared/trace_waterfall/use_trace_waterfall';

function FullTraceButton({ isLoading, isDisabled }: { isLoading?: boolean; isDisabled?: boolean }) {
  return (
    <EuiButtonEmpty
      aria-label={i18n.translate('xpack.apm.fullTraceButton.viewFullTraceButton.ariaLabel', {
        defaultMessage: 'View full trace',
      })}
      data-test-subj="apmFullTraceButtonViewFullTraceButton"
      iconType="apmTrace"
      isLoading={isLoading}
      disabled={isDisabled}
    >
      {i18n.translate('xpack.apm.transactionDetails.viewFullTraceButtonLabel', {
        defaultMessage: 'View full trace',
      })}
    </EuiButtonEmpty>
  );
}

export function MaybeViewTraceLink({
  isLoading,
  transaction,
  waterfall,
  environment,
  useUnified = false,
  traceItems = [],
}: {
  isLoading: boolean;
  transaction?: ITransaction;
  waterfall: IWaterfall;
  environment: Environment;
  useUnified?: boolean;
  traceItems?: TraceItem[];
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

  const rootTransactionInfo = useMemo(() => {
    if (!useUnified) {
      const root = waterfall.rootWaterfallTransaction;
      if (!root) return undefined;
      return {
        id: root.id,
        name: root.doc.transaction.name,
        serviceName: root.doc.service.name,
        traceId: root.doc.trace.id,
        transactionType: root.doc.transaction.type,
        serviceEnvironment: root.doc.service.environment,
      };
    }
    const traceMap = getTraceParentChildrenMap(traceItems, false);
    const root = traceMap.root?.[0];
    if (!root || root.docType !== 'transaction') return undefined;
    return {
      id: root.id,
      name: root.name,
      serviceName: root.serviceName,
      traceId: root.traceId,
      transactionType: root.type,
      serviceEnvironment: root.serviceEnvironment,
    };
  }, [useUnified, waterfall.rootWaterfallTransaction, traceItems]);

  if (isLoading || !transaction) {
    return <FullTraceButton isLoading={isLoading} />;
  }

  // the traceroot cannot be found, so we cannot link to it
  if (!rootTransactionInfo) {
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

  const isRoot = transaction.transaction.id === rootTransactionInfo.id;
  const nextEnvironment = getNextEnvironmentUrlParam({
    requestedEnvironment: rootTransactionInfo.serviceEnvironment ?? ENVIRONMENT_NOT_DEFINED.value,
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
        transactionName={rootTransactionInfo.name}
        href={link('/services/{serviceName}/transactions/view', {
          path: { serviceName: rootTransactionInfo.serviceName },
          query: {
            ...query,
            latencyAggregationType,
            traceId: rootTransactionInfo.traceId,
            transactionId: rootTransactionInfo.id,
            transactionName: rootTransactionInfo.name,
            transactionType: rootTransactionInfo.transactionType,
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
