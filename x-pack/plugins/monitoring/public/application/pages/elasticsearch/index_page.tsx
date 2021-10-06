/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../global_state_context';
// @ts-ignore
import { IndexReact } from '../../../components/elasticsearch/index/index_react';
import { ComponentProps } from '../../route_init';
import { SetupModeRenderer, SetupModeProps } from '../../setup_mode/setup_mode_renderer';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { useCharts } from '../../hooks/use_charts';
import { ItemTemplate } from './item_template';
// @ts-ignore
import { indicesByNodes } from '../../../components/elasticsearch/shard_allocation/transformers/indices_by_nodes';
// @ts-ignore
import { labels } from '../../../components/elasticsearch/shard_allocation/lib/labels';

export const ElasticsearchIndexPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const { index }: { index: string } = useParams();
  const { zoomInfo, onBrush } = useCharts();
  const clusterUuid = globalState.cluster_uuid;
  const [data, setData] = useState({} as any);
  const [indexLabel, setIndexLabel] = useState(labels.index as any);
  const [nodesByIndicesData, setNodesByIndicesData] = useState([]);

  const title = i18n.translate('xpack.monitoring.elasticsearch.index.overview.title', {
    defaultMessage: 'Elasticsearch - Indices - {indexName} - Overview',
    values: {
      indexName: index,
    },
  });

  const pageTitle = i18n.translate('xpack.monitoring.elasticsearch.index.overview.pageTitle', {
    defaultMessage: 'Index: {indexName}',
    values: {
      indexName: index,
    },
  });

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/elasticsearch/indices/${index}`;
    const response = await services.http?.fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        timeRange: {
          min: bounds.min.toISOString(),
          max: bounds.max.toISOString(),
        },
        is_advanced: false,
      }),
    });
    setData(response);
    const transformer = indicesByNodes();
    setNodesByIndicesData(transformer(response.shards, response.nodes));

    const shards = response.shards;
    if (shards.some((shard: any) => shard.state === 'UNASSIGNED')) {
      setIndexLabel(labels.indexWithUnassigned);
    }
  }, [clusterUuid, services.data?.query.timefilter.timefilter, services.http, index]);

  return (
    <ItemTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      id={index}
      pageType="indices"
    >
      <SetupModeRenderer
        render={({ setupMode, flyoutComponent, bottomBarComponent }: SetupModeProps) => (
          <SetupModeContext.Provider value={{ setupModeSupported: true }}>
            {flyoutComponent}
            <IndexReact
              setupMode={setupMode}
              labels={indexLabel}
              alerts={{}}
              onBrush={onBrush}
              indexUuid={index}
              clusterUuid={clusterUuid}
              zoomInfo={zoomInfo}
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
