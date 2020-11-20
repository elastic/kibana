/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiCallOut,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import styled from 'styled-components';
import { SERVICE_NODE_NAME_MISSING } from '../../../../common/service_nodes';
import { LegacyChartsSyncContextProvider as ChartsSyncContextProvider } from '../../../context/charts_sync_context';
import { useAgentName } from '../../../hooks/useAgentName';
import { FETCH_STATUS, useFetcher } from '../../../hooks/useFetcher';
import { useServiceMetricCharts } from '../../../hooks/useServiceMetricCharts';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { px, truncate, unit } from '../../../style/variables';
import { ApmHeader } from '../../shared/ApmHeader';
import { MetricsChart } from '../../shared/charts/MetricsChart';
import { ElasticDocsLink } from '../../shared/Links/ElasticDocsLink';
import { SearchBar } from '../../shared/search_bar';

const INITIAL_DATA = {
  host: '',
  containerId: '',
};

const Truncate = styled.span`
  display: block;
  ${truncate(px(unit * 12))}
`;

const MetadataFlexGroup = styled(EuiFlexGroup)`
  border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
  margin-bottom: ${({ theme }) => theme.eui.paddingSizes.m};
  padding: ${({ theme }) =>
    `${theme.eui.paddingSizes.m} 0 0 ${theme.eui.paddingSizes.m}`};
`;

type ServiceNodeMetricsProps = RouteComponentProps<{
  serviceName: string;
  serviceNodeName: string;
}>;

export function ServiceNodeMetrics({ match }: ServiceNodeMetricsProps) {
  const { urlParams, uiFilters } = useUrlParams();
  const { serviceName, serviceNodeName } = match.params;
  const { agentName } = useAgentName();
  const { data } = useServiceMetricCharts(urlParams, agentName);
  const { start, end } = urlParams;

  const { data: { host, containerId } = INITIAL_DATA, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint:
            'GET /api/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
          params: {
            path: { serviceName, serviceNodeName },
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });
      }
    },
    [serviceName, serviceNodeName, start, end, uiFilters]
  );

  const isLoading = status === FETCH_STATUS.LOADING;
  const isAggregatedData = serviceNodeName === SERVICE_NODE_NAME_MISSING;

  return (
    <>
      <ApmHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h1>{serviceName}</h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ApmHeader>
      {isAggregatedData ? (
        <EuiCallOut
          title={i18n.translate(
            'xpack.apm.serviceNodeMetrics.unidentifiedServiceNodesWarningTitle',
            {
              defaultMessage: 'Could not identify JVMs',
            }
          )}
          iconType="help"
          color="warning"
        >
          <FormattedMessage
            id="xpack.apm.serviceNodeMetrics.unidentifiedServiceNodesWarningText"
            defaultMessage="We could not identify which JVMs these metrics belong to. This is likely caused by running a version of APM Server that is older than 7.5. Upgrading to APM Server 7.5 or higher should resolve this issue. For more information on upgrading, see the {link}. As an alternative, you can use the Kibana Query bar to filter by hostname, container ID or other fields."
            values={{
              link: (
                <ElasticDocsLink
                  target="_blank"
                  section="/apm/server"
                  path="/upgrading.html"
                >
                  {i18n.translate(
                    'xpack.apm.serviceNodeMetrics.unidentifiedServiceNodesWarningDocumentationLink',
                    { defaultMessage: 'documentation of APM Server' }
                  )}
                </ElasticDocsLink>
              ),
            }}
          />
        </EuiCallOut>
      ) : (
        <MetadataFlexGroup gutterSize="xl">
          <EuiFlexItem grow={false}>
            <EuiStat
              titleSize="s"
              description={i18n.translate(
                'xpack.apm.serviceNodeMetrics.serviceName',
                {
                  defaultMessage: 'Service name',
                }
              )}
              title={
                <EuiToolTip content={serviceName}>
                  <Truncate>{serviceName}</Truncate>
                </EuiToolTip>
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiStat
              titleSize="s"
              isLoading={isLoading}
              description={i18n.translate('xpack.apm.serviceNodeMetrics.host', {
                defaultMessage: 'Host',
              })}
              title={
                <EuiToolTip content={host}>
                  <Truncate>{host}</Truncate>
                </EuiToolTip>
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              titleSize="s"
              isLoading={isLoading}
              description={i18n.translate(
                'xpack.apm.serviceNodeMetrics.containerId',
                {
                  defaultMessage: 'Container ID',
                }
              )}
              title={
                <EuiToolTip content={containerId}>
                  <Truncate>{containerId}</Truncate>
                </EuiToolTip>
              }
            />
          </EuiFlexItem>
        </MetadataFlexGroup>
      )}
      <SearchBar />
      <EuiPage>
        {agentName && (
          <ChartsSyncContextProvider>
            <EuiFlexGrid columns={2} gutterSize="s">
              {data.charts.map((chart) => (
                <EuiFlexItem key={chart.key}>
                  <EuiPanel>
                    <MetricsChart start={start} end={end} chart={chart} />
                  </EuiPanel>
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
            <EuiSpacer size="xxl" />
          </ChartsSyncContextProvider>
        )}
      </EuiPage>
    </>
  );
}
