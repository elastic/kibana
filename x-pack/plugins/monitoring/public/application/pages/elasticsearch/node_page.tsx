/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { find } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ItemTemplate } from './item_template';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { Node } from '../../../components/elasticsearch';
import { ComponentProps } from '../../route_init';
import { SetupModeRenderer, SetupModeProps } from '../../../components/renderers/setup_mode';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { useLocalStorage } from '../../hooks/use_local_storage';
import { useCharts } from '../../hooks/use_charts';
import { nodesByIndices } from '../../../components/elasticsearch/shard_allocation/transformers/nodes_by_indices';
// @ts-ignore
import { labels } from '../../../components/elasticsearch/shard_allocation/lib/labels';
import { AlertsByName } from '../../../alerts/types';
import { fetchAlerts } from '../../../lib/fetch_alerts';
import {
  ELASTICSEARCH_SYSTEM_ID,
  RULE_CPU_USAGE,
  RULE_THREAD_POOL_SEARCH_REJECTIONS,
  RULE_THREAD_POOL_WRITE_REJECTIONS,
  RULE_MISSING_MONITORING_DATA,
  RULE_DISK_USAGE,
  RULE_MEMORY_USAGE,
} from '../../../../common/constants';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';

export const ElasticsearchNodePage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  const { zoomInfo, onBrush } = useCharts();
  const [showSystemIndices, setShowSystemIndices] = useLocalStorage<boolean>(
    'showSystemIndices',
    false
  );
  const [alerts, setAlerts] = useState<AlertsByName>({});

  const { node }: { node: string } = useParams();
  const { services } = useKibana<{ data: any }>();
  const [data, setData] = useState({} as any);

  const clusterUuid = globalState.cluster_uuid;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, {
        inElasticsearch: true,
        name: 'nodes',
        instance: data?.nodeSummary?.name,
      });
    }
  }, [cluster, generateBreadcrumbs, data?.nodeSummary?.name]);
  const ccs = globalState.ccs;
  const [nodesByIndicesData, setNodesByIndicesData] = useState([]);

  const title = i18n.translate('xpack.monitoring.elasticsearch.node.overview.title', {
    defaultMessage: 'Elasticsearch - Nodes - {nodeName} - Overview',
    values: {
      nodeName: data?.nodeSummary?.name,
    },
  });

  const pageTitle = i18n.translate('xpack.monitoring.elasticsearch.node.overview.pageTitle', {
    defaultMessage: 'Elasticsearch node: {node}',
    values: {
      node: data?.nodeSummary?.name,
    },
  });

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/elasticsearch/nodes/${node}`;
    if (services.http?.fetch && clusterUuid) {
      const response = await services.http?.fetch<{ shards: unknown[]; nodes: unknown[] }>(url, {
        method: 'POST',
        body: JSON.stringify({
          showSystemIndices,
          ccs,
          timeRange: {
            min: bounds.min.toISOString(),
            max: bounds.max.toISOString(),
          },
          is_advanced: false,
        }),
      });

      setData(response);
      const transformer = nodesByIndices();
      setNodesByIndicesData(transformer(response.shards, response.nodes));
      const alertsResponse = await fetchAlerts({
        fetch: services.http.fetch,
        alertTypeIds: [
          RULE_CPU_USAGE,
          RULE_THREAD_POOL_SEARCH_REJECTIONS,
          RULE_THREAD_POOL_WRITE_REJECTIONS,
          RULE_MISSING_MONITORING_DATA,
          RULE_DISK_USAGE,
          RULE_MEMORY_USAGE,
        ],
        filters: [{ nodeUuid: node }],
        clusterUuid,
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
    node,
    showSystemIndices,
    ccs,
  ]);

  const toggleShowSystemIndices = useCallback(() => {
    setShowSystemIndices(!showSystemIndices);
  }, [showSystemIndices, setShowSystemIndices]);

  return (
    <ItemTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      id={node}
      pageType="nodes"
    >
      <SetupModeRenderer
        productName={ELASTICSEARCH_SYSTEM_ID}
        render={({ setupMode, flyoutComponent, bottomBarComponent }: SetupModeProps) => (
          <SetupModeContext.Provider value={{ setupModeSupported: true }}>
            {flyoutComponent}
            <Node
              alerts={alerts}
              labels={labels.node}
              nodeId={node}
              clusterUuid={clusterUuid}
              onBrush={onBrush}
              zoomInfo={zoomInfo}
              toggleShowSystemIndices={toggleShowSystemIndices}
              showSystemIndices={showSystemIndices}
              nodesByIndices={nodesByIndicesData}
              {...data}
            />
            {bottomBarComponent}
          </SetupModeContext.Provider>
        )}
      />
    </ItemTemplate>
  );
};
