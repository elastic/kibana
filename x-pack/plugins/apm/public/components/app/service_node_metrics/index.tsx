/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import {
  getServiceNodeName,
  SERVICE_NODE_NAME_MISSING,
} from '../../../../common/service_nodes';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useServiceMetricChartsFetcher } from '../../../hooks/use_service_metric_charts_fetcher';
import { truncate, unit } from '../../../utils/style';
import { MetricsChart } from '../../shared/charts/metrics_chart';
import { ElasticDocsLink } from '../../shared/Links/ElasticDocsLink';

const INITIAL_DATA = {
  host: '',
  containerId: '',
};

const Truncate = euiStyled.span`
  display: block;
  ${truncate(unit * 12)}
`;

export function ServiceNodeMetrics() {
  const {
    urlParams: { start, end },
  } = useUrlParams();
  const { agentName, serviceName } = useApmServiceContext();

  const apmRouter = useApmRouter();

  const {
    path: { serviceNodeName },
    query,
  } = useApmParams('/services/:serviceName/nodes/:serviceNodeName/metrics');

  const { environment, kuery } = query;

  useBreadcrumb({
    title: getServiceNodeName(serviceNodeName),
    href: apmRouter.link(
      '/services/:serviceName/nodes/:serviceNodeName/metrics',
      {
        path: {
          serviceName,
          serviceNodeName,
        },
        query,
      }
    ),
  });

  const { data } = useServiceMetricChartsFetcher({
    serviceNodeName,
    kuery,
    environment,
  });

  const { data: { host, containerId } = INITIAL_DATA, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint:
            'GET /api/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
          params: {
            path: { serviceName, serviceNodeName },
            query: {
              kuery,
              start,
              end,
            },
          },
        });
      }
    },
    [kuery, serviceName, serviceNodeName, start, end]
  );

  const isLoading = status === FETCH_STATUS.LOADING;
  const isAggregatedData = serviceNodeName === SERVICE_NODE_NAME_MISSING;

  return (
    <>
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
        <EuiPanel hasShadow={false} paddingSize={'none'}>
          <EuiSpacer size={'s'} />
          <EuiFlexGroup gutterSize="xl">
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
                description={i18n.translate(
                  'xpack.apm.serviceNodeMetrics.host',
                  {
                    defaultMessage: 'Host',
                  }
                )}
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
          </EuiFlexGroup>
          <EuiSpacer size={'s'} />
        </EuiPanel>
      )}

      {agentName && (
        <ChartPointerEventContextProvider>
          <EuiFlexGrid columns={2} gutterSize="s">
            {data.charts.map((chart) => (
              <EuiFlexItem key={chart.key}>
                <EuiPanel hasBorder={true}>
                  <MetricsChart
                    start={start}
                    end={end}
                    chart={chart}
                    fetchStatus={status}
                  />
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
          <EuiSpacer size="xxl" />
        </ChartPointerEventContextProvider>
      )}
    </>
  );
}
