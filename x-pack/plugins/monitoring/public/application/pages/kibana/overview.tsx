/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { KibanaTemplate } from './kibana_template';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { ComponentProps } from '../../route_init';
// @ts-ignore
import { MonitoringTimeseriesContainer } from '../../../components/chart';
// @ts-ignore
import { ClusterStatus } from '../../../components/kibana/cluster_status';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';
import { useCharts } from '../../hooks/use_charts';

const KibanaOverview = ({ data }: { data: any }) => {
  const { zoomInfo, onBrush } = useCharts();

  if (!data) return null;

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPanel>
          <ClusterStatus stats={data.clusterStatus} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPageContent>
          <EuiFlexGroup>
            <EuiFlexItem grow={true}>
              <MonitoringTimeseriesContainer
                series={data.metrics.kibana_cluster_requests}
                onBrush={onBrush}
                zoomInfo={zoomInfo}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <MonitoringTimeseriesContainer
                series={data.metrics.kibana_cluster_response_times}
                onBrush={onBrush}
                zoomInfo={zoomInfo}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

export const KibanaOverviewPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  const [data, setData] = useState<any>();
  const clusterUuid = globalState.cluster_uuid;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;
  const ccs = globalState.ccs;
  const title = i18n.translate('xpack.monitoring.kibana.overview.title', {
    defaultMessage: 'Kibana',
  });
  const pageTitle = i18n.translate('xpack.monitoring.kibana.overview.pageTitle', {
    defaultMessage: 'Kibana overview',
  });

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, {
        inKibana: true,
      });
    }
  }, [cluster, generateBreadcrumbs]);

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/kibana`;

    const response = await services.http?.fetch(url, {
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
  }, [ccs, clusterUuid, services.data?.query.timefilter.timefilter, services.http]);

  return (
    <KibanaTemplate getPageData={getPageData} title={title} pageTitle={pageTitle}>
      <KibanaOverview data={data} />
    </KibanaTemplate>
  );
};
