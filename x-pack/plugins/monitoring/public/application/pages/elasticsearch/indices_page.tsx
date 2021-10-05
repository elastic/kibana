/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import { ElasticsearchTemplate } from './elasticsearch_template';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../global_state_context';
import { ElasticsearchIndices } from '../../../components/elasticsearch';
import { ComponentProps } from '../../route_init';
import { SetupModeRenderer, SetupModeProps } from '../../setup_mode/setup_mode_renderer';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { useTable } from '../../hooks/use_table';
import { useLocalStorage } from '../../hooks/use_local_storage';

export const ElasticsearchIndicesPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const { getPaginationTableProps } = useTable('elasticsearch.indices');
  const clusterUuid = globalState.cluster_uuid;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  });
  const [data, setData] = useState({} as any);
  const [showSystemIndices, setShowSystemIndices] = useLocalStorage<boolean>(
    'showSystemIndices',
    false
  );

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
    const response = await services.http?.fetch(url, {
      method: 'POST',
      query: {
        show_system_indices: showSystemIndices,
      },
      body: JSON.stringify({
        timeRange: {
          min: bounds.min.toISOString(),
          max: bounds.max.toISOString(),
        },
      }),
    });
    setData(response);
  }, [showSystemIndices, clusterUuid, services.data?.query.timefilter.timefilter, services.http]);

  return (
    <ElasticsearchTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      data-test-subj="elasticsearchOverviewPage"
      cluster={cluster}
    >
      <div data-test-subj="elasticsearchNodesListingPage">
        <SetupModeRenderer
          render={({ flyoutComponent, bottomBarComponent }: SetupModeProps) => (
            <SetupModeContext.Provider value={{ setupModeSupported: true }}>
              {flyoutComponent}
              <ElasticsearchIndices
                clusterStatus={data.clusterStatus}
                indices={data.indices}
                alerts={{}}
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
