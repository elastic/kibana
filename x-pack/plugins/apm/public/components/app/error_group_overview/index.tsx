/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useErrorGroupDistributionFetcher } from '../../../hooks/use_error_group_distribution_fetcher';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { FailedTransactionRateChart } from '../../shared/charts/failed_transaction_rate_chart';
import { ErrorDistribution } from '../error_group_details/Distribution';
import { ErrorGroupList } from './error_group_list';

export function ErrorGroupOverview() {
  const { serviceName } = useApmServiceContext();

  const {
    query: { environment, kuery, sortField, sortDirection, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/errors');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { errorDistributionData, status } = useErrorGroupDistributionFetcher({
    serviceName,
    groupId: undefined,
    environment,
    kuery,
  });

  const { data: errorGroupListData } = useFetcher(
    (callApmApi) => {
      const normalizedSortDirection = sortDirection === 'asc' ? 'asc' : 'desc';

      if (start && end) {
        return callApmApi({
          endpoint: 'GET /internal/apm/services/{serviceName}/errors',
          params: {
            path: {
              serviceName,
            },
            query: {
              environment,
              kuery,
              start,
              end,
              sortField,
              sortDirection: normalizedSortDirection,
            },
          },
        });
      }
    },
    [environment, kuery, serviceName, start, end, sortField, sortDirection]
  );

  if (!errorDistributionData || !errorGroupListData) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup direction="row" gutterSize="s">
          <ChartPointerEventContextProvider>
            <EuiFlexItem>
              <EuiPanel hasBorder={true}>
                <ErrorDistribution
                  fetchStatus={status}
                  distribution={errorDistributionData}
                  title={i18n.translate(
                    'xpack.apm.serviceDetails.metrics.errorOccurrencesChart.title',
                    { defaultMessage: 'Error occurrences' }
                  )}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <FailedTransactionRateChart
                kuery={kuery}
                environment={environment}
              />
            </EuiFlexItem>
          </ChartPointerEventContextProvider>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate(
                'xpack.apm.serviceDetails.metrics.errorsList.title',
                { defaultMessage: 'Errors' }
              )}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <ErrorGroupList
            items={errorGroupListData.errorGroups}
            serviceName={serviceName}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
