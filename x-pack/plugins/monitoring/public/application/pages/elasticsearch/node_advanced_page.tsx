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
// @ts-ignore
import { AdvancedNode } from '../../../components/elasticsearch/node/advanced';
import { ComponentProps } from '../../route_init';
import { useCharts } from '../../hooks/use_charts';

export const ElasticsearchNodeAdvancedPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { zoomInfo, onBrush } = useCharts();

  const { node }: { node: string } = useParams();
  const { services } = useKibana<{ data: any }>();

  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const [data, setData] = useState({} as any);

  const title = i18n.translate('xpack.monitoring.elasticsearch.node.advanced.title', {
    defaultMessage: 'Elasticsearch - Nodes - {nodeName} - Advanced',
    values: {
      nodeName: data?.nodeSummary?.name,
    },
  });

  const pageTitle = i18n.translate('xpack.monitoring.elasticsearch.node.advanced.pageTitle', {
    defaultMessage: 'Elasticsearch node: {nodeName}',
    values: {
      nodeName: data?.nodeSummary?.name,
    },
  });

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/elasticsearch/nodes/${node}`;

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
  }, [ccs, clusterUuid, services.data?.query.timefilter.timefilter, services.http, node]);

  return (
    <ItemTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      id={node}
      pageType="nodes"
    >
      <AdvancedNode
        nodeSummary={data.nodeSummary}
        alerts={{}}
        metrics={data.metrics}
        onBrush={onBrush}
        zoomInfo={zoomInfo}
      />
    </ItemTemplate>
  );
};
