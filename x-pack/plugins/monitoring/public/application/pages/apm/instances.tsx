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
import { GlobalStateContext } from '../../contexts/global_state_context';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { useTable } from '../../hooks/use_table';
import { ApmTemplate } from './apm_template';
// @ts-ignore
import { ApmServerInstances } from '../../../components/apm/instances';
import { SetupModeRenderer } from '../../../components/renderers/setup_mode';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';
import { APM_SYSTEM_ID } from '../../../../common/constants';

interface SetupModeProps {
  setupMode: any;
  flyoutComponent: any;
  bottomBarComponent: any;
}

export const ApmInstancesPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  const { updateTotalItemCount, getPaginationTableProps } = useTable('apm.instances');
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;
  const [data, setData] = useState({} as any);

  const title = i18n.translate('xpack.monitoring.apm.instances.routeTitle', {
    defaultMessage: '{apm} - Instances',
    values: {
      apm: 'APM server',
    },
  });

  const pageTitle = i18n.translate('xpack.monitoring.apm.instances.pageTitle', {
    defaultMessage: 'APM server instances',
  });

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, {
        inApm: true,
      });
    }
  }, [cluster, generateBreadcrumbs]);

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/apm/instances`;
    const response = await services.http?.fetch<{ stats: { total: number } }>(url, {
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
    updateTotalItemCount(response?.stats.total);
  }, [
    ccs,
    clusterUuid,
    services.data?.query.timefilter.timefilter,
    services.http,
    updateTotalItemCount,
  ]);

  const { pagination, sorting, onTableChange } = getPaginationTableProps();

  return (
    <ApmTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      data-test-subj="apmInstancesPage"
    >
      <SetupModeRenderer
        productName={APM_SYSTEM_ID}
        render={({ setupMode, flyoutComponent, bottomBarComponent }: SetupModeProps) => (
          <SetupModeContext.Provider value={{ setupModeSupported: true }}>
            {flyoutComponent}
            <ApmServerInstances
              setupMode={setupMode}
              apms={{
                pagination,
                sorting,
                onTableChange,
                data,
              }}
            />
            {bottomBarComponent}
          </SetupModeContext.Provider>
        )}
      />
    </ApmTemplate>
  );
};
