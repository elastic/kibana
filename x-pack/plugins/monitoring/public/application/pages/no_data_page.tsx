/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { NoData } from '../../components/no_data';
import { PageTemplate } from './page_template';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CODE_PATH_LICENSE, STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';

export const NoDataPage = () => {
  const { services } = useKibana<{ data: any }>();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const title = i18n.translate('xpack.monitoring.noData.routeTitle', {
    defaultMessage: 'Setup Monitoring',
  });

  const url = '../api/monitoring/v1/clusters';

  const getData = async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const min = bounds.min.toISOString();
    const max = bounds.max.toISOString();

    const codePaths = [CODE_PATH_LICENSE];

    let catchReason;

    try {
      const response = await services.http?.fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          css: undefined,
          timeRange: {
            min,
            max,
          },
          codePaths,
        }),
      });

      const clusters = formatClusters(response);

      if (clusters && clusters.length) {
        setShouldRedirect(true);
        // TODO should this return?
        // return clusters;
      }
    } catch (err) {
      if (err && err.status === 503) {
        // TODO something useful with the error reason
        catchReason = {
          property: 'custom',
          message: err.message,
        };
      }
    }
  };

  return (
    <PageTemplate title={title} getData={getData}>
      {shouldRedirect ? <Redirect to="/home" /> : <NoData />}
    </PageTemplate>
  );
};

function formatClusters(clusters: any) {
  return clusters.map(formatCluster);
}

function formatCluster(cluster: any) {
  if (cluster.cluster_uuid === STANDALONE_CLUSTER_CLUSTER_UUID) {
    cluster.cluster_name = 'Standalone Cluster';
  }
  return cluster;
}
