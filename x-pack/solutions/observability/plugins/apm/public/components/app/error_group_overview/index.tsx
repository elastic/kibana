/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
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
import { FailedTransactionRateChart } from '../../shared/charts/failed_transaction_rate_chart';
import { ErrorDistribution } from '../error_group_details/distribution';
import { ErrorGroupList } from './error_group_list';
import { ErrorsFromLogsSection } from './errors_from_logs';
import { useServiceErrorsFromLogs } from './errors_from_logs/use_service_errors_from_logs';
import { getApmErrorsPresence } from './use_has_apm_errors';

export function ErrorGroupOverview() {
  const { serviceName } = useApmServiceContext();

  const {
    query: { environment, kuery, comparisonEnabled, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/errors');

  const { errorDistributionData, errorDistributionStatus } = useErrorGroupDistributionFetcher({
    serviceName,
    groupId: undefined,
    environment,
    kuery,
  });

  const errorsFromLogs = useServiceErrorsFromLogs({
    serviceName,
    environment,
    kuery,
    rangeFrom,
    rangeTo,
  });

  // Collapse the APM section only when we know it is empty AND there is something to show
  // instead. Every other state (including pending states) keeps APM visible, which is
  // the arrangement the overwhelming majority of services land on, so layout is stable.
  const apmErrors = getApmErrorsPresence({ errorDistributionData, errorDistributionStatus });
  const showApmSection = !(apmErrors === 'absent' && errorsFromLogs.hasRows);

  const chartTitle = i18n.translate(
    'xpack.apm.serviceDetails.metrics.errorOccurrencesChart.title',
    { defaultMessage: 'Error occurrences' }
  );

  const apmSectionTitle = (
    <EuiTitle size="s">
      <h2>
        {i18n.translate('xpack.apm.errorGroupOverview.apmErrorsSectionTitle', {
          defaultMessage: 'APM errors',
        })}
      </h2>
    </EuiTitle>
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* ── APM errors section (hidden for log-only services) ── */}
      {showApmSection && (
        <EuiFlexItem>
          <EuiAccordion
            id="apm-errors-accordion"
            data-test-subj="apmErrorsSection"
            initialIsOpen={true}
            buttonContent={apmSectionTitle}
            paddingSize="none"
          >
            <EuiSpacer size="s" />
            {/* ChartPointerEventContextProvider scopes pointer sync to the two
                 time-series charts inside this section (FailedTransactionRate and
                 ErrorDistribution). Both live here so the provider need not be hoisted. */}
            <ChartPointerEventContextProvider>
              <EuiFlexGroup direction="row" gutterSize="s" wrap>
                <EuiFlexItem>
                  <FailedTransactionRateChart kuery={kuery} />
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiPanel hasBorder={true}>
                    <ErrorDistribution
                      fetchStatus={errorDistributionStatus}
                      distribution={errorDistributionData}
                      title={chartTitle}
                      discoverParams={{
                        label: i18n.translate('xpack.apm.errorGroupOverview.openErrorsInDiscover', {
                          defaultMessage: 'Open errors in Discover',
                        }),
                        rangeFrom,
                        rangeTo,
                        queryParams: {
                          kuery,
                          serviceName,
                          sortDirection: 'DESC',
                        },
                      }}
                    />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </ChartPointerEventContextProvider>

            <EuiSpacer size="s" />
            <EuiFlexItem>
              {/* No inner title — the accordion button above already says "APM errors". */}
              <EuiPanel hasBorder={true}>
                <EuiSpacer size="xs" />
                <ErrorGroupList
                  serviceName={serviceName}
                  comparisonEnabled={comparisonEnabled}
                  initialPageSize={10}
                  tableCaption={chartTitle}
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiAccordion>
        </EuiFlexItem>
      )}

      {/* ── Errors from logs section ── */}
      <EuiFlexItem>
        <ErrorsFromLogsSection
          serviceName={serviceName}
          environment={environment}
          kuery={kuery}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          {...errorsFromLogs}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
