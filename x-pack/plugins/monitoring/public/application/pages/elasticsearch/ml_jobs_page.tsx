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
import { ElasticsearchMLJobs } from '../../../components/elasticsearch';
import { ComponentProps } from '../../route_init';
import { SetupModeRenderer } from '../../setup_mode/setup_mode_renderer';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { useTable } from '../../hooks/use_table';
import type { MLJobs } from '../../../types';

interface SetupModeProps {
  setupMode: any;
  flyoutComponent: any;
  bottomBarComponent: any;
}

export const ElasticsearchMLJobsPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const { getPaginationTableProps } = useTable('elasticsearch.mlJobs');
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  });
  const [data, setData] = useState({} as any);

  const title = i18n.translate('xpack.monitoring.elasticsearch.mlJobs.routeTitle', {
    defaultMessage: 'Elasticsearch - Machine Learning Jobs',
  });

  const pageTitle = i18n.translate('xpack.monitoring.elasticsearch.mlJobs.pageTitle', {
    defaultMessage: 'Elasticsearch machine learning jobs',
  });

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/elasticsearch/ml_jobs`;
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
    setData({
      clusterStatus: response.clusterStatus,
      jobs: (response.rows as MLJobs).map((job) => {
        if ('ml' in job && job.ml?.job) {
          return {
            ...job.ml.job,
            node: job.node,
            job_id: job.ml.job.id,
          };
        }
        return job;
      }),
    });
  }, [ccs, clusterUuid, services.data?.query.timefilter.timefilter, services.http]);

  return (
    <ElasticsearchTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      data-test-subj="elasticsearchOverviewPage"
      cluster={cluster}
    >
      <div data-test-subj="elasticsearchMLJobsListingPage">
        <SetupModeRenderer
          render={({ flyoutComponent, bottomBarComponent }: SetupModeProps) => (
            <SetupModeContext.Provider value={{ setupModeSupported: true }}>
              {flyoutComponent}
              <ElasticsearchMLJobs
                clusterStatus={data.clusterStatus}
                jobs={data.jobs}
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
