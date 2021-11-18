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
import { Ccr } from '../../../components/elasticsearch/ccr';
import { ComponentProps } from '../../route_init';
import { SetupModeRenderer } from '../../../components/renderers/setup_mode';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { AlertsByName } from '../../../alerts/types';
import { fetchAlerts } from '../../../lib/fetch_alerts';
import { ELASTICSEARCH_SYSTEM_ID, RULE_CCR_READ_EXCEPTIONS } from '../../../../common/constants';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';
interface SetupModeProps {
  setupMode: any;
  flyoutComponent: any;
  bottomBarComponent: any;
}

export const ElasticsearchCcrPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  const { services } = useKibana<{ data: any }>();

  const clusterUuid = globalState.cluster_uuid;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;
  const ccs = globalState.ccs;
  const [data, setData] = useState({} as any);
  const [alerts, setAlerts] = useState<AlertsByName>({});

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, {
        inElasticsearch: true,
      });
    }
  }, [cluster, generateBreadcrumbs]);

  const title = i18n.translate('xpack.monitoring.elasticsearch.ccr.title', {
    defaultMessage: 'Elasticsearch - Ccr',
  });

  const pageTitle = i18n.translate('xpack.monitoring.elasticsearch.ccr.pageTitle', {
    defaultMessage: 'Elasticsearch Ccr',
  });

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/elasticsearch/ccr`;

    if (services.http?.fetch && clusterUuid) {
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
      const alertsResponse = await fetchAlerts({
        fetch: services.http.fetch,
        alertTypeIds: [RULE_CCR_READ_EXCEPTIONS],
        clusterUuid,
        timeRange: {
          min: bounds.min.valueOf(),
          max: bounds.max.valueOf(),
        },
      });
      setAlerts(alertsResponse);
    }
  }, [ccs, clusterUuid, services.data?.query.timefilter.timefilter, services.http]);

  return (
    <ElasticsearchTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      data-test-subj="elasticsearchCcrPage"
      cluster={cluster}
    >
      <SetupModeRenderer
        productName={ELASTICSEARCH_SYSTEM_ID}
        render={({ flyoutComponent, bottomBarComponent }: SetupModeProps) => (
          <SetupModeContext.Provider value={{ setupModeSupported: true }}>
            {flyoutComponent}
            <Ccr data={data.data} alerts={alerts} />
            {bottomBarComponent}
          </SetupModeContext.Provider>
        )}
      />
    </ElasticsearchTemplate>
  );
};
