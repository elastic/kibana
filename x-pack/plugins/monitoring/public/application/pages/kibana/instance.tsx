/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ComponentProps } from '../../route_init';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { useCharts } from '../../hooks/use_charts';
// @ts-ignore
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';
// @ts-ignore
import { MonitoringTimeseriesContainer } from '../../../components/chart';
// @ts-ignore
import { DetailStatus } from '../../../components/kibana/detail_status';
import { PageTemplate } from '../page_template';
import { AlertsCallout } from '../../../alerts/callout';
import { AlertsByName } from '../../../alerts/types';
import { fetchAlerts } from '../../../lib/fetch_alerts';
import { RULE_KIBANA_VERSION_MISMATCH } from '../../../../common/constants';

const KibanaInstance = ({ data, alerts }: { data: any; alerts: any }) => {
  const { zoomInfo, onBrush } = useCharts();

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPanel>
          <DetailStatus stats={data.kibanaSummary} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <AlertsCallout alerts={alerts} />
        <EuiPageContent>
          <EuiFlexGrid columns={2} gutterSize="s">
            <EuiFlexItem grow={true}>
              <MonitoringTimeseriesContainer
                series={data.metrics.kibana_requests}
                onBrush={onBrush}
                zoomInfo={zoomInfo}
              />
              <EuiSpacer />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <MonitoringTimeseriesContainer
                series={data.metrics.kibana_response_times}
                onBrush={onBrush}
                zoomInfo={zoomInfo}
              />
              <EuiSpacer />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <MonitoringTimeseriesContainer
                series={data.metrics.kibana_memory}
                onBrush={onBrush}
                zoomInfo={zoomInfo}
              />
              <EuiSpacer />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <MonitoringTimeseriesContainer
                series={data.metrics.kibana_average_concurrent_connections}
                onBrush={onBrush}
                zoomInfo={zoomInfo}
              />
              <EuiSpacer />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <MonitoringTimeseriesContainer
                series={data.metrics.kibana_os_load}
                onBrush={onBrush}
                zoomInfo={zoomInfo}
              />
              <EuiSpacer />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <MonitoringTimeseriesContainer
                series={data.metrics.kibana_process_delay}
                onBrush={onBrush}
                zoomInfo={zoomInfo}
              />
              <EuiSpacer />
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

export const KibanaInstancePage: React.FC<ComponentProps> = ({ clusters }) => {
  const { instance }: { instance: string } = useParams();

  const globalState = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;
  const [data, setData] = useState({} as any);
  const [instanceName, setInstanceName] = useState('');
  const [alerts, setAlerts] = useState<AlertsByName>({});

  const title = `Kibana - ${instanceName}`;
  const pageTitle = i18n.translate('xpack.monitoring.kibana.instance.pageTitle', {
    defaultMessage: 'Kibana instance: {instance}',
    values: {
      instance: instanceName,
    },
  });

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, {
        inKibana: true,
        instance: instanceName,
      });
    }
  }, [cluster, instanceName, generateBreadcrumbs]);

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/kibana/${instance}`;
    if (services.http?.fetch && clusterUuid) {
      const response = await services.http?.fetch<{ kibanaSummary: { name: string } }>(url, {
        method: 'POST',
        body: JSON.stringify({
          ccs,
          timeRange: {
            min: bounds.min.toISOString(),
            max: bounds.max.toISOString(),
          },
        }),
      });
      setData(response);
      setInstanceName(response.kibanaSummary.name);
      const alertsResponse = await fetchAlerts({
        fetch: services.http.fetch,
        alertTypeIds: [RULE_KIBANA_VERSION_MISMATCH],
        clusterUuid,
        timeRange: {
          min: bounds.min.valueOf(),
          max: bounds.max.valueOf(),
        },
      });
      setAlerts(alertsResponse);
    }
  }, [ccs, clusterUuid, instance, services.data?.query.timefilter.timefilter, services.http]);

  return (
    <PageTemplate title={title} pageTitle={pageTitle} getPageData={getPageData}>
      <div data-test-subj="kibanaInstancePage">
        <KibanaInstance data={data} alerts={alerts} />
      </div>
    </PageTemplate>
  );
};
