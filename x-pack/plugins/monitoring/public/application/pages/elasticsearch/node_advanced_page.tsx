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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ItemTemplate } from './item_template';
import { GlobalStateContext } from '../../contexts/global_state_context';
// @ts-ignore
import { AdvancedNode } from '../../../components/elasticsearch/node/advanced';
import { ComponentProps } from '../../route_init';
import { useCharts } from '../../hooks/use_charts';
import { AlertsByName } from '../../../alerts/types';
import { fetchAlerts } from '../../../lib/fetch_alerts';
import {
  RULE_CPU_USAGE,
  RULE_THREAD_POOL_SEARCH_REJECTIONS,
  RULE_THREAD_POOL_WRITE_REJECTIONS,
  RULE_MISSING_MONITORING_DATA,
  RULE_DISK_USAGE,
  RULE_MEMORY_USAGE,
} from '../../../../common/constants';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';

export const ElasticsearchNodeAdvancedPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  const { zoomInfo, onBrush } = useCharts();
  const [data, setData] = useState({} as any);

  const { node }: { node: string } = useParams();
  const { services } = useKibana<{ data: any }>();

  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const [alerts, setAlerts] = useState<AlertsByName>({});

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
        clusterUuid,
        alertTypeIds: [
          RULE_CPU_USAGE,
          RULE_THREAD_POOL_SEARCH_REJECTIONS,
          RULE_THREAD_POOL_WRITE_REJECTIONS,
          RULE_MISSING_MONITORING_DATA,
          RULE_DISK_USAGE,
          RULE_MEMORY_USAGE,
        ],
        filters: [
          {
            nodeUuid: node,
          },
        ],
        timeRange: {
          min: bounds.min.valueOf(),
          max: bounds.max.valueOf(),
        },
      });
      setAlerts(alertsResponse);
    }
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
        alerts={alerts}
        metrics={data.metrics}
        onBrush={onBrush}
        zoomInfo={zoomInfo}
      />
    </ItemTemplate>
  );
};
