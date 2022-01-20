/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import { ComponentProps } from '../../route_init';
import { EntSearchTemplate } from './ent_search_template';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { useCharts } from '../../hooks/use_charts';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { EnterpriseSearchOverview } from '../../../components/enterprise_search/overview';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';

export const EntSearchOverviewPage: React.FC<ComponentProps> = ({ clusters }) => {
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

  const title = i18n.translate('xpack.monitoring.entSearch.overview.routeTitle', {
    defaultMessage: 'Enterprise Search - Overview',
  });

  const pageTitle = i18n.translate('xpack.monitoring.entSearch.overview.pageTitle', {
    defaultMessage: 'Enterprise Search Overview',
  });

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, { inEnterpriseSearch: true });
    }
  }, [cluster, generateBreadcrumbs]);

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/enterprise_search`;

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

  return (
    <EntSearchTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      data-test-subj="entSearchOverviewPage"
    >
      <div data-test-subj="entSearchOverviewPage">
        {data && <EnterpriseSearchOverview {...data} onBrush={onBrush} zoomInfo={zoomInfo} />}
      </div>
    </EntSearchTemplate>
  );
};
