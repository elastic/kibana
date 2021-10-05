/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { ItemTemplate } from './item_template';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../global_state_context';
import { NodeReact } from '../../../components/elasticsearch';
import { ComponentProps } from '../../route_init';
import { SetupModeRenderer, SetupModeProps } from '../../setup_mode/setup_mode_renderer';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { useLocalStorage } from '../../hooks/use_local_storage';
import { useCharts } from '../../hooks/use_charts';
import { nodesByIndices } from '../../../components/elasticsearch/shard_allocation/transformers/nodes_by_indices';
// @ts-ignore
import { labels } from '../../../components/elasticsearch/shard_allocation/lib/labels';

export const ElasticsearchNodePage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { zoomInfo, onBrush } = useCharts();
  const [showSystemIndices, setShowSystemIndices] = useLocalStorage<boolean>(
    'showSystemIndices',
    false
  );

  const { node }: { node: string } = useParams();
  const { services } = useKibana<{ data: any }>();

  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const [data, setData] = useState({} as any);
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

    const response = await services.http?.fetch(url, {
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
  }, [
    ccs,
    clusterUuid,
    services.data?.query.timefilter.timefilter,
    services.http,
    node,
    showSystemIndices,
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
        render={({ setupMode, flyoutComponent, bottomBarComponent }: SetupModeProps) => (
          <SetupModeContext.Provider value={{ setupModeSupported: true }}>
            {flyoutComponent}
            <NodeReact
              alerts={{}}
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
