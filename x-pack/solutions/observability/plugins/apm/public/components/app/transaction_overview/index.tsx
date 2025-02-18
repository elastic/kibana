/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { isServerlessAgentName } from '../../../../common/agent_name';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { useTimeRange } from '../../../hooks/use_time_range';
import { AggregatedTransactionsBadge } from '../../shared/aggregated_transactions_badge';
import { TransactionCharts } from '../../shared/charts/transaction_charts';
import { replace } from '../../shared/links/url_helpers';
import { SloCallout } from '../../shared/slo_callout';
import { TransactionsTable } from '../../shared/transactions_table';
import { isLogsOnlySignal } from '../../../utils/get_signal_type';
import { ServiceTabEmptyState } from '../service_tab_empty_state';

export function TransactionOverview() {
  const {
    query: {
      environment,
      kuery,
      rangeFrom,
      rangeTo,
      transactionType: transactionTypeFromUrl,
      comparisonEnabled,
      offset,
    },
  } = useApmParams('/services/{serviceName}/transactions');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const [hasLoadedTable, setHasLoadedTable] = useState(false);
  const { onPageReady } = usePerformanceContext();
  const { transactionType, fallbackToTransactions, serverlessType, serviceName } =
    useApmServiceContext();

  useEffect(() => {
    if (hasLoadedTable) {
      onPageReady({
        meta: {
          rangeFrom,
          rangeTo,
        },
      });
    }
  }, [hasLoadedTable, onPageReady, rangeFrom, rangeTo]);

  const history = useHistory();

  // redirect to first transaction type
  if (!transactionTypeFromUrl && transactionType) {
    replace(history, { query: { transactionType } });
  }

  const isServerless = isServerlessAgentName(serverlessType);

  const [sloCalloutDismissed, setSloCalloutDismissed] = useLocalStorage(
    'apm.sloCalloutDismissed',
    false
  );

  const setScreenContext = useApmPluginContext().observabilityAIAssistant?.service.setScreenContext;

  useEffect(() => {
    return setScreenContext?.({
      screenDescription: `The user is looking at the transactions overview for ${serviceName}, and the transaction type is ${transactionType}`,
    });
  }, [setScreenContext, serviceName, transactionType]);

  const { serviceEntitySummary } = useApmServiceContext();

  const hasLogsOnlySignal =
    serviceEntitySummary?.dataStreamTypes && isLogsOnlySignal(serviceEntitySummary.dataStreamTypes);

  if (hasLogsOnlySignal) {
    return <ServiceTabEmptyState id="transactionOverview" />;
  }

  return (
    <>
      {!sloCalloutDismissed && (
        <SloCallout
          dismissCallout={() => {
            setSloCalloutDismissed(true);
          }}
          serviceName={serviceName}
          environment={environment}
          transactionType={transactionType}
        />
      )}
      {fallbackToTransactions && (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <AggregatedTransactionsBadge />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}
      <TransactionCharts
        serviceName={serviceName}
        kuery={kuery}
        environment={environment}
        start={start}
        end={end}
        isServerlessContext={isServerless}
        comparisonEnabled={comparisonEnabled}
        offset={offset}
      />
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={true}>
        <TransactionsTable
          hideViewTransactionsLink
          numberOfTransactionsPerPage={10}
          showMaxTransactionGroupsExceededWarning
          onLoadTable={() => setHasLoadedTable(true)}
          environment={environment}
          kuery={kuery}
          start={start}
          end={end}
          saveTableOptionsToUrl
        />
      </EuiPanel>
    </>
  );
}
