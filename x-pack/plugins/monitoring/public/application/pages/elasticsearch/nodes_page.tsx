/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ElasticsearchTemplate } from './elasticsearch_template';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { ExternalConfigContext } from '../../contexts/external_config_context';
import { ElasticsearchNodes } from '../../../components/elasticsearch';
import { ComponentProps } from '../../route_init';
import { SetupModeRenderer, SetupModeProps } from '../../../components/renderers/setup_mode';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { useTable } from '../../hooks/use_table';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';
import { AlertsByName } from '../../../alerts/types';
import { fetchAlerts } from '../../../lib/fetch_alerts';
import {
  ELASTICSEARCH_SYSTEM_ID,
  RULE_CPU_USAGE,
  RULE_DISK_USAGE,
  RULE_THREAD_POOL_SEARCH_REJECTIONS,
  RULE_THREAD_POOL_WRITE_REJECTIONS,
  RULE_MEMORY_USAGE,
  RULE_MISSING_MONITORING_DATA,
} from '../../../../common/constants';

export const ElasticsearchNodesPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { showCgroupMetricsElasticsearch } = useContext(ExternalConfigContext);
  const { services } = useKibana<{ data: any }>();
  const [isLoading, setIsLoading] = React.useState(false);
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  const { getPaginationRouteOptions, updateTotalItemCount, getPaginationTableProps } =
    useTable('elasticsearch.nodes');
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;
  const [data, setData] = useState({} as any);
  const [alerts, setAlerts] = useState<AlertsByName>({});

  const title = i18n.translate('xpack.monitoring.elasticsearch.nodes.routeTitle', {
    defaultMessage: 'Elasticsearch - Nodes',
  });

  const pageTitle = i18n.translate('xpack.monitoring.elasticsearch.nodes.pageTitle', {
    defaultMessage: 'Elasticsearch nodes',
  });

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, {
        inElasticsearch: true,
      });
    }
  }, [cluster, generateBreadcrumbs]);

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/elasticsearch/nodes`;
    if (services.http?.fetch && clusterUuid) {
      setIsLoading(true);
      const response = await services.http?.fetch<{ totalNodeCount: number }>(url, {
        method: 'POST',
        body: JSON.stringify({
          ccs,
          timeRange: {
            min: bounds.min.toISOString(),
            max: bounds.max.toISOString(),
          },
          ...getPaginationRouteOptions(),
        }),
      });

      setIsLoading(false);
      setData(response);
      updateTotalItemCount(response.totalNodeCount);
      const alertsResponse = await fetchAlerts({
        fetch: services.http.fetch,
        clusterUuid,
        alertTypeIds: [
          RULE_CPU_USAGE,
          RULE_DISK_USAGE,
          RULE_THREAD_POOL_SEARCH_REJECTIONS,
          RULE_THREAD_POOL_WRITE_REJECTIONS,
          RULE_MEMORY_USAGE,
          RULE_MISSING_MONITORING_DATA,
        ],
        timeRange: {
          min: bounds.min.valueOf(),
          max: bounds.max.valueOf(),
        },
      });
      setAlerts(alertsResponse);
    }
  }, [
    services.data?.query.timefilter.timefilter,
    services.http,
    clusterUuid,
    ccs,
    getPaginationRouteOptions,
    updateTotalItemCount,
  ]);

  return (
    <ElasticsearchTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      data-test-subj="elasticsearchOverviewPage"
      cluster={cluster}
    >
      <div data-test-subj="elasticsearchNodesListingPage">
        <SetupModeRenderer
          productName={ELASTICSEARCH_SYSTEM_ID}
          render={({ setupMode, flyoutComponent, bottomBarComponent }: SetupModeProps) => (
            <SetupModeContext.Provider value={{ setupModeSupported: true }}>
              {flyoutComponent}
              <ElasticsearchNodes
                clusterStatus={data.clusterStatus}
                clusterUuid={globalState.cluster_uuid}
                setupMode={setupMode}
                nodes={data.nodes}
                alerts={alerts}
                isLoading={isLoading}
                showCgroupMetricsElasticsearch={showCgroupMetricsElasticsearch}
                {...getPaginationTableProps()}
              />
              {bottomBarComponent}
            </SetupModeContext.Provider>
          )}
        />
      </div>
    </ElasticsearchTemplate>
  );
};
