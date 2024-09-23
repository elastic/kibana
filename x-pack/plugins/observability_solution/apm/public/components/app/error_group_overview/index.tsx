/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useErrorGroupDistributionFetcher } from '../../../hooks/use_error_group_distribution_fetcher';
import { FailedTransactionRateChart } from '../../shared/charts/failed_transaction_rate_chart';
import { ErrorDistribution } from '../error_group_details/distribution';
import { ErrorGroupList } from './error_group_list';
import { isLogsOnlySignal } from '../../../utils/get_signal_type';
import { ServiceTabEmptyState } from '../service_tab_empty_state';

export function ErrorGroupOverview() {
  const { serviceName } = useApmServiceContext();
  const { serviceEntitySummary } = useApmServiceContext();

  const {
    query: { environment, kuery, comparisonEnabled },
  } = useApmParams('/services/{serviceName}/errors');

  const { errorDistributionData, errorDistributionStatus } = useErrorGroupDistributionFetcher({
    serviceName,
    groupId: undefined,
    environment,
    kuery,
  });

  const hasLogsOnlySignal =
    serviceEntitySummary?.dataStreamTypes && isLogsOnlySignal(serviceEntitySummary.dataStreamTypes);

  if (hasLogsOnlySignal) {
    return <ServiceTabEmptyState id="errorGroupOverview" />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup direction="row" gutterSize="s">
          <ChartPointerEventContextProvider>
            <EuiFlexItem>
              <EuiPanel hasBorder={true}>
                <ErrorDistribution
                  fetchStatus={errorDistributionStatus}
                  distribution={errorDistributionData}
                  title={i18n.translate(
                    'xpack.apm.serviceDetails.metrics.errorOccurrencesChart.title',
                    { defaultMessage: 'Error occurrences' }
                  )}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <FailedTransactionRateChart kuery={kuery} />
            </EuiFlexItem>
          </ChartPointerEventContextProvider>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.apm.serviceDetails.metrics.errorsList.title', {
                defaultMessage: 'Errors',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <ErrorGroupList
            serviceName={serviceName}
            comparisonEnabled={comparisonEnabled}
            initialPageSize={10}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
