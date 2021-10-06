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
import { GlobalStateContext } from '../../global_state_context';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { useTable } from '../../hooks/use_table';
import { KibanaTemplate } from './kibana_template';
// @ts-ignore
import { KibanaInstances } from '../../../components/kibana/instances';
// @ts-ignore
import { SetupModeRenderer, SetupModeProps } from '../../setup_mode/setup_mode_renderer';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';

export const KibanaInstancesPage: React.FC<ComponentProps> = ({ clusters }) => {
  const { cluster_uuid: clusterUuid, ccs } = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  const { updateTotalItemCount, getPaginationTableProps } = useTable('kibana.instances');
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;
  const [data, setData] = useState({} as any);

  const title = i18n.translate('xpack.monitoring.kibana.instances.routeTitle', {
    defaultMessage: 'Kibana - Instances',
  });

  const pageTitle = i18n.translate('xpack.monitoring.kibana.instances.pageTitle', {
    defaultMessage: 'Kibana instances',
  });

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, {
        inKibana: true,
      });
    }
  }, [cluster, generateBreadcrumbs]);

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/kibana/instances`;
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
    updateTotalItemCount(response.stats.total);
  }, [
    ccs,
    clusterUuid,
    services.data?.query.timefilter.timefilter,
    services.http,
    updateTotalItemCount,
  ]);

  return (
    <KibanaTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      data-test-subj="kibanaInstancesPage"
    >
      <div data-test-subj="monitoringKibanaInstancesApp">
        <SetupModeRenderer
          productName="kibana"
          render={({ setupMode, flyoutComponent, bottomBarComponent }: SetupModeProps) => (
            <SetupModeContext.Provider value={{ setupModeSupported: true }}>
              {flyoutComponent}
              <KibanaInstances
                alerts={{}}
                instances={data.kibanas}
                setupMode={setupMode}
                clusterStatus={data.clusterStatus}
                {...getPaginationTableProps()}
              />
              {bottomBarComponent}
            </SetupModeContext.Provider>
          )}
        />
      </div>
    </KibanaTemplate>
  );
};
