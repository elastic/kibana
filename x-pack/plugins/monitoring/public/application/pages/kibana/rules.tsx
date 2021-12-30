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
import { KibanaTemplate } from './kibana_template';
import { KibanaRules } from '../../../components/kibana/rules';
// @ts-ignore
import { SetupModeRenderer, SetupModeProps } from '../../../components/renderers/setup_mode';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';
import { AlertsByName } from '../../../alerts/types';
import { fetchAlerts } from '../../../lib/fetch_alerts';
import { RULE_KIBANA_VERSION_MISMATCH } from '../../../../common/constants';

export const KibanaRulesPage: React.FC<ComponentProps> = ({ clusters }) => {
  const { cluster_uuid: clusterUuid, ccs } = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  const { updateTotalItemCount, getPaginationTableProps } = useTable('kibana.rules');
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;
  const [data, setData] = useState({} as any);
  const [alerts, setAlerts] = useState<AlertsByName>({});

  const title = i18n.translate('xpack.monitoring.kibana.rules.routeTitle', {
    defaultMessage: 'Kibana - Rules',
  });

  const pageTitle = i18n.translate('xpack.monitoring.kibana.rules.pageTitle', {
    defaultMessage: 'Kibana rules',
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
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/kibana/rules`;
    if (services.http?.fetch && clusterUuid) {
      const response = await services.http?.fetch<{ rules: { length: number } }>(url, {
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
      updateTotalItemCount(response.rules.length);
      const alertsResponse = await fetchAlerts({
        fetch: services.http.fetch,
        alertTypeIds: [RULE_KIBANA_VERSION_MISMATCH],
        clusterUuid,
        timeRange: {
          min: bounds.min.valueOf(),
          max: bounds.max.valueOf(),
        },
      });
      setAlerts(alertsResponse);
    }
  }, [
    ccs,
    clusterUuid,
    services.data?.query.timefilter.timefilter,
    services.http,
    updateTotalItemCount,
  ]);

  return (
    <KibanaTemplate title={title} pageTitle={pageTitle} getPageData={getPageData}>
      <div data-test-subj="monitoringKibanaRulesApp">
        <KibanaRules
          alerts={alerts}
          rules={data.rules}
          clusterStatus={data.clusterStatus}
          {...getPaginationTableProps()}
        />
      </div>
    </KibanaTemplate>
  );
};
