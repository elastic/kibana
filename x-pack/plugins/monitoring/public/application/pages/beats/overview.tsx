/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { ComponentProps } from '../../route_init';
import { BeatsTemplate } from './beats_template';
import { GlobalStateContext } from '../../global_state_context';
import { useCharts } from '../../hooks/use_charts';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
// import { ElasticsearchOverview } from '../../../components/beats';

export const BeatsOverviewPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { zoomInfo, onBrush } = useCharts();
  const { services } = useKibana<{ data: any }>();
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  });
  const [data, setData] = useState(null);

  const title = i18n.translate('xpack.monitoring.beats.overview.routeTitle', {
    defaultMessage: 'Beats - Overview',
  });

  const pageTitle = i18n.translate('xpack.monitoring.beats.overview.pageTitle', {
    defaultMessage: 'Beats overview',
  });

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/beats`;

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

  const renderOverview = (overviewData: any) => {
    if (overviewData === null) {
      return null;
    }
    const { clusterStatus, metrics } = overviewData || {};

    return (
      <div>Still finding it</div>
      // <BeatsOverview
      //   clusterStatus={clusterStatus}
      //   metrics={metrics}
      //   logs={logs}
      //   cluster={cluster}
      //   shardActivity={shardActivityData}
      //   onBrush={onBrush}
      //   showShardActivityHistory={showShardActivityHistory}
      //   toggleShardActivityHistory={toggleShardActivityHistory}
      //   zoomInfo={zoomInfo}
      //   data-test-subj="elasticsearchOverviewPage"
      // />
    );
  };

  return (
    <BeatsTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      data-test-subj="beatsOverviewPage"
      cluster={cluster}
    >
      <div data-test-subj="beatsOverviewPage">{renderOverview(data)}</div>
    </BeatsTemplate>
  );
};
