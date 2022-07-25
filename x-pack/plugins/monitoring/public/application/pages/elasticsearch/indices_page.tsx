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
import { ElasticsearchTemplate } from './elasticsearch_template';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { ElasticsearchIndices } from '../../../components/elasticsearch';
import { ComponentProps } from '../../route_init';
import { SetupModeRenderer, SetupModeProps } from '../../../components/renderers/setup_mode';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { useTable } from '../../hooks/use_table';
import { useLocalStorage } from '../../hooks/use_local_storage';
import { AlertsByName } from '../../../alerts/types';
import { fetchAlerts } from '../../../lib/fetch_alerts';
import { ELASTICSEARCH_SYSTEM_ID, RULE_LARGE_SHARD_SIZE } from '../../../../common/constants';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';

export const ElasticsearchIndicesPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  const { services } = useKibana<{ data: any }>();
  const { getPaginationTableProps } = useTable('elasticsearch.indices');
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;
  const [data, setData] = useState({} as any);
  const [showSystemIndices, setShowSystemIndices] = useLocalStorage<boolean>(
    'showSystemIndices',
    false
  );
  const [alerts, setAlerts] = useState<AlertsByName>({});

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, {
        inElasticsearch: true,
      });
    }
  }, [cluster, generateBreadcrumbs]);

  const title = i18n.translate('xpack.monitoring.elasticsearch.indices.routeTitle', {
    defaultMessage: 'Elasticsearch - Indices',
  });

  const pageTitle = i18n.translate('xpack.monitoring.elasticsearch.indices.pageTitle', {
    defaultMessage: 'Elasticsearch indices',
  });

  const toggleShowSystemIndices = useCallback(
    () => setShowSystemIndices(!showSystemIndices),
    [showSystemIndices, setShowSystemIndices]
  );

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/elasticsearch/indices`;
    if (services.http?.fetch && clusterUuid) {
      const response = await services.http?.fetch(url, {
        method: 'POST',
        query: {
          show_system_indices: showSystemIndices,
        },
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
        clusterUuid,
        alertTypeIds: [RULE_LARGE_SHARD_SIZE],
        timeRange: {
          min: bounds.min.valueOf(),
          max: bounds.max.valueOf(),
        },
      });
      setAlerts(alertsResponse);
    }
  }, [
    services.data?.query.timefilter.timefilter,
    services.http,
    clusterUuid,
    showSystemIndices,
    ccs,
  ]);

  return (
    <ElasticsearchTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      data-test-subj="elasticsearchOverviewPage"
      cluster={cluster}
    >
      <div data-test-subj="elasticsearchIndicesListingPage">
        <SetupModeRenderer
          productName={ELASTICSEARCH_SYSTEM_ID}
          render={({ flyoutComponent, bottomBarComponent }: SetupModeProps) => (
            <SetupModeContext.Provider value={{ setupModeSupported: true }}>
              {flyoutComponent}
              <ElasticsearchIndices
                clusterStatus={data.clusterStatus}
                indices={data.indices}
                alerts={alerts}
                showSystemIndices={showSystemIndices}
                toggleShowSystemIndices={toggleShowSystemIndices}
                {...getPaginationTableProps()}
              />
              {bottomBarComponent}
            </SetupModeContext.Provider>
          )}
        />
      </div>
    </ElasticsearchTemplate>
  );
};
