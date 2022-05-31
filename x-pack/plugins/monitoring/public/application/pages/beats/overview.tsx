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
import { ComponentProps } from '../../route_init';
import { BeatsTemplate } from './beats_template';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { useCharts } from '../../hooks/use_charts';
// @ts-ignore
import { BeatsOverview } from '../../../components/beats/overview';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';

export const BeatsOverviewPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { zoomInfo, onBrush } = useCharts();
  const { services } = useKibana<{ data: any }>();
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;

  const [data, setData] = useState(null);

  const title = i18n.translate('xpack.monitoring.beats.overview.routeTitle', {
    defaultMessage: 'Beats - Overview',
  });

  const pageTitle = i18n.translate('xpack.monitoring.beats.overview.pageTitle', {
    defaultMessage: 'Beats overview',
  });

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, {
        inBeats: true,
      });
    }
  }, [cluster, generateBreadcrumbs]);

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/beats`;

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
    return <BeatsOverview {...overviewData} onBrush={onBrush} zoomInfo={zoomInfo} />;
  };

  return (
    <BeatsTemplate title={title} pageTitle={pageTitle} getPageData={getPageData}>
      <div>{renderOverview(data)}</div>
    </BeatsTemplate>
  );
};
