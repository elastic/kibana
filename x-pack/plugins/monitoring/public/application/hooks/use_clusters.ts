/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';

export function useClusters(codePaths?: string[], fetchAllClusters?: boolean, ccs?: any) {
  const clusterUuid = fetchAllClusters ? null : '';
  const { services } = useKibana<{ data: any }>();

  const bounds = services.data?.query.timefilter.timefilter.getBounds();
  const [min] = useState(bounds.min.toISOString());
  const [max] = useState(bounds.max.toISOString());

  const [clusters, setClusters] = useState([]);
  const [loaded, setLoaded] = useState<boolean | null>(false);

  let url = '../api/monitoring/v1/clusters';
  if (clusterUuid) {
    url += `/${clusterUuid}`;
  }

  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const response = await services.http?.fetch(url, {
          method: 'POST',
          body: JSON.stringify({
            ccs,
            timeRange: {
              min,
              max,
            },
            codePaths,
          }),
        });

        setClusters(formatClusters(response));
      } catch (err) {
        // TODO: handle errors
      } finally {
        setLoaded(null);
      }
    };

    fetchClusters();
  }, [ccs, services.http, codePaths, url, min, max]);

  return { clusters, loaded };
}

function formatClusters(clusters: any) {
  return clusters.map(formatCluster);
}

function formatCluster(cluster: any) {
  if (cluster.cluster_uuid === STANDALONE_CLUSTER_CLUSTER_UUID) {
    cluster.cluster_name = 'Standalone Cluster';
  }
  return cluster;
}
