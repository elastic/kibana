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
import { GlobalStateContext } from '../../contexts/global_state_context';
// @ts-ignore
import { ElasticsearchOverview } from '../../../components/elasticsearch';
import { ComponentProps } from '../../route_init';
import { useCharts } from '../../hooks/use_charts';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';

export const ElasticsearchOverviewPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { zoomInfo, onBrush } = useCharts();
  const { services } = useKibana<{ data: any }>();
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;
  const [data, setData] = useState(null);
  const [showShardActivityHistory, setShowShardActivityHistory] = useState(false);
  const toggleShardActivityHistory = () => {
    setShowShardActivityHistory(!showShardActivityHistory);
  };
  const filterShardActivityData = (shardActivity: any) => {
    return shardActivity.filter((row: any) => {
      return showShardActivityHistory || row.stage !== 'DONE';
    });
  };

  const title = i18n.translate('xpack.monitoring.elasticsearch.overview.title', {
    defaultMessage: 'Elasticsearch',
  });

  const pageTitle = i18n.translate('xpack.monitoring.elasticsearch.overview.pageTitle', {
    defaultMessage: 'Elasticsearch overview',
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
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/elasticsearch`;

    const response = await services.http?.fetch<any>(url, {
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

  const renderOverview = (overviewData: any) => {
    if (overviewData === null) {
      return null;
    }
    const { clusterStatus, metrics, shardActivity, logs } = overviewData || {};
    const shardActivityData = shardActivity && filterShardActivityData(shardActivity); // no filter on data = null

    return (
      <ElasticsearchOverview
        clusterStatus={clusterStatus}
        metrics={metrics}
        logs={logs}
        cluster={cluster}
        shardActivity={shardActivityData}
        onBrush={onBrush}
        showShardActivityHistory={showShardActivityHistory}
        toggleShardActivityHistory={toggleShardActivityHistory}
        zoomInfo={zoomInfo}
        data-test-subj="elasticsearchOverviewPage"
      />
    );
  };

  return (
    <ElasticsearchTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      data-test-subj="elasticsearchOverviewPage"
      cluster={cluster}
    >
      <div data-test-subj="elasticsearchOverviewPage">{renderOverview(data)}</div>
    </ElasticsearchTemplate>
  );
};
