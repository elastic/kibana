/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import { ElasticsearchTemplate } from './elasticsearch_template';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../global_state_context';
import { ExternalConfigContext } from '../../external_config_context';
import { ElasticsearchNodes } from '../../../components/elasticsearch';
import { ComponentProps } from '../../route_init';
import { SetupModeRenderer, SetupModeProps } from '../../setup_mode/setup_mode_renderer';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { useTable } from '../../hooks/use_table';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';

export const ElasticsearchNodesPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { showCgroupMetricsElasticsearch } = useContext(ExternalConfigContext);
  const { services } = useKibana<{ data: any }>();
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  const { getPaginationRouteOptions, updateTotalItemCount, getPaginationTableProps } =
    useTable('elasticsearch.nodes');
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;
  const [data, setData] = useState({} as any);

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
    const response = await services.http?.fetch(url, {
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

    setData(response);
    updateTotalItemCount(response.totalNodeCount);
  }, [
    ccs,
    clusterUuid,
    services.data?.query.timefilter.timefilter,
    services.http,
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
          render={({ setupMode, flyoutComponent, bottomBarComponent }: SetupModeProps) => (
            <SetupModeContext.Provider value={{ setupModeSupported: true }}>
              {flyoutComponent}
              <ElasticsearchNodes
                clusterStatus={data.clusterStatus}
                clusterUuid={globalState.cluster_uuid}
                setupMode={setupMode}
                nodes={data.nodes}
                alerts={{}}
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
