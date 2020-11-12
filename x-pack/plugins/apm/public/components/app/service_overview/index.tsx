/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { useTrackPageview } from '../../../../../observability/public';
import { isRumAgentName } from '../../../../common/agent_name';
import { ChartsSyncContextProvider } from '../../../context/charts_sync_context';
import { TransactionErrorRateChart } from '../../shared/charts/transaction_error_rate_chart';
import { ServiceMapLink } from '../../shared/Links/apm/ServiceMapLink';
import { TransactionOverviewLink } from '../../shared/Links/apm/TransactionOverviewLink';
import { ServiceOverviewErrorsTable } from './service_overview_errors_table';
import { TableLinkFlexItem } from './table_link_flex_item';

const rowHeight = 310;
const latencyChartRowHeight = 230;

const Row = styled(EuiFlexItem)`
  height: ${rowHeight}px;
`;

const LatencyChartRow = styled(EuiFlexItem)`
  height: ${latencyChartRowHeight}px;
`;

interface ServiceOverviewProps {
  agentName?: string;
  serviceName: string;
}

export function ServiceOverview({
  agentName,
  serviceName,
}: ServiceOverviewProps) {
  useTrackPageview({ app: 'apm', path: 'service_overview' });
  useTrackPageview({ app: 'apm', path: 'service_overview', delay: 15000 });

  return (
    <ChartsSyncContextProvider>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup
            gutterSize="xs"
            style={{ marginTop: 16, marginBottom: 8 }}
          >
            <EuiFlexItem grow={2}>
              <EuiPanel>Search bar</EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel>Comparison picker</EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel>Date picker</EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <LatencyChartRow>
          <EuiPanel>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.apm.serviceOverview.latencyChartTitle', {
                  defaultMessage: 'Latency',
                })}
              </h2>
            </EuiTitle>
          </EuiPanel>
        </LatencyChartRow>
        <Row>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={4}>
              <EuiPanel>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.apm.serviceOverview.trafficChartTitle',
                      {
                        defaultMessage: 'Traffic',
                      }
                    )}
                  </h2>
                </EuiTitle>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={6}>
              <EuiPanel>
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h2>
                        {i18n.translate(
                          'xpack.apm.serviceOverview.transactionsTableTitle',
                          {
                            defaultMessage: 'Transactions',
                          }
                        )}
                      </h2>
                    </EuiTitle>
                  </EuiFlexItem>
                  <TableLinkFlexItem>
                    <TransactionOverviewLink serviceName={serviceName}>
                      {i18n.translate(
                        'xpack.apm.serviceOverview.transactionsTableLinkText',
                        {
                          defaultMessage: 'View transactions',
                        }
                      )}
                    </TransactionOverviewLink>
                  </TableLinkFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Row>
        <Row>
          <EuiFlexGroup gutterSize="s">
            {!isRumAgentName(agentName) && (
              <EuiFlexItem grow={4}>
                <TransactionErrorRateChart showAnnotations={false} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={6}>
              <EuiPanel>
                <ServiceOverviewErrorsTable serviceName={serviceName} />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Row>
        <Row>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={4}>
              <EuiPanel>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h2>
                        {i18n.translate(
                          'xpack.apm.serviceOverview.averageDurationBySpanTypeChartTitle',
                          {
                            defaultMessage: 'Average duration by span type',
                          }
                        )}
                      </h2>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={6}>
              <EuiPanel>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h2>
                        {i18n.translate(
                          'xpack.apm.serviceOverview.dependenciesTableTitle',
                          {
                            defaultMessage: 'Dependencies',
                          }
                        )}
                      </h2>
                    </EuiTitle>
                  </EuiFlexItem>
                  <TableLinkFlexItem>
                    <ServiceMapLink serviceName={serviceName}>
                      {i18n.translate(
                        'xpack.apm.serviceOverview.dependenciesTableLinkText',
                        {
                          defaultMessage: 'View service map',
                        }
                      )}
                    </ServiceMapLink>
                  </TableLinkFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Row>
        <Row>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={4}>
              <EuiPanel>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.apm.serviceOverview.instancesLatencyDistributionChartTitle',
                      {
                        defaultMessage: 'Instances latency distribution',
                      }
                    )}
                  </h2>
                </EuiTitle>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={6}>
              <EuiPanel>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.apm.serviceOverview.instancesTableTitle',
                      {
                        defaultMessage: 'Instances',
                      }
                    )}
                  </h2>
                </EuiTitle>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Row>
      </EuiFlexGroup>
    </ChartsSyncContextProvider>
  );
}
