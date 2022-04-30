/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import {
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiSpacer,
  EuiPageContent,
  EuiFlexGrid,
  EuiFlexItem,
} from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { ComponentProps } from '../../route_init';
// @ts-ignore
import { Listing } from '../../../components/logstash/listing';
import { LogstashTemplate } from './logstash_template';
// @ts-ignore
import { DetailStatus } from '../../../components/logstash/detail_status';
// @ts-ignore
import { MonitoringTimeseriesContainer } from '../../../components/chart';
import { AlertsCallout } from '../../../alerts/callout';
import { useCharts } from '../../hooks/use_charts';
import { AlertsByName } from '../../../alerts/types';
import { fetchAlerts } from '../../../lib/fetch_alerts';
import { RULE_LOGSTASH_VERSION_MISMATCH } from '../../../../common/constants';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';

export const LogStashNodeAdvancedPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const match = useRouteMatch<{ uuid: string | undefined }>();
  const { services } = useKibana<{ data: any }>();
  const clusterUuid = globalState.cluster_uuid;
  const { zoomInfo, onBrush } = useCharts();
  const ccs = globalState.ccs;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;

  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);

  const [data, setData] = useState({} as any);
  const [alerts, setAlerts] = useState<AlertsByName>({});

  const title = i18n.translate('xpack.monitoring.logstash.node.advanced.routeTitle', {
    defaultMessage: 'Logstash - {nodeName} - Advanced',
    values: {
      nodeName: data.nodeSummary ? data.nodeSummary.name : '',
    },
  });

  const pageTitle = i18n.translate('xpack.monitoring.logstash.node.advanced.pageTitle', {
    defaultMessage: 'Logstash node: {nodeName}',
    values: {
      nodeName: data.nodeSummary ? data.nodeSummary.name : '',
    },
  });

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/logstash/node/${match.params.uuid}`;
    if (services.http?.fetch && clusterUuid) {
      const response = await services.http?.fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          ccs,
          timeRange: {
            min: bounds.min.toISOString(),
            max: bounds.max.toISOString(),
          },
          is_advanced: true,
        }),
      });
      setData(response);
      const alertsResponse = await fetchAlerts({
        fetch: services.http.fetch,
        alertTypeIds: [RULE_LOGSTASH_VERSION_MISMATCH],
        clusterUuid,
        timeRange: {
          min: bounds.min.valueOf(),
          max: bounds.max.valueOf(),
        },
      });
      setAlerts(alertsResponse);
    }
  }, [
    ccs,
    clusterUuid,
    services.data?.query.timefilter.timefilter,
    services.http,
    match.params.uuid,
  ]);

  const metricsToShow = useMemo(() => {
    if (!data.metrics) return [];

    return [
      data.metrics.logstash_node_cpu_utilization,
      data.metrics.logstash_queue_events_count,
      data.metrics.logstash_node_cgroup_cpu,
      data.metrics.logstash_pipeline_queue_size,
      data.metrics.logstash_node_cgroup_stats,
    ];
  }, [data.metrics]);

  useEffect(() => {
    if (cluster && data.nodeSummary) {
      generateBreadcrumbs(cluster.cluster_name, {
        inLogstash: true,
        instance: data.nodeSummary.host,
        name: 'nodes',
      });
    }
  }, [cluster, data, generateBreadcrumbs]);

  return (
    <LogstashTemplate
      instance={data}
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      cluster={cluster}
    >
      <EuiPage>
        <EuiPageBody>
          <EuiPanel>{data.nodeSummary && <DetailStatus stats={data.nodeSummary} />}</EuiPanel>
          <EuiSpacer size="m" />
          <AlertsCallout alerts={alerts} />
          <EuiPageContent>
            <EuiFlexGrid columns={2} gutterSize="s">
              {metricsToShow.map((metric, index) => (
                <EuiFlexItem key={index}>
                  <MonitoringTimeseriesContainer
                    series={metric}
                    onBrush={onBrush}
                    zoomInfo={zoomInfo}
                    {...data}
                  />
                  <EuiSpacer />
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </LogstashTemplate>
  );
};
