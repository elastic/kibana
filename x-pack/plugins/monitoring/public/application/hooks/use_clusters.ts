/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { fetchClusters } from '../../lib/fetch_clusters';
import { useRequestErrorHandler } from './use_request_error_handler';

export function useClusters(clusterUuid?: string | null, ccs?: any, codePaths?: string[]) {
  const { services } = useKibana<{ data: any }>();

  const bounds = services.data?.query.timefilter.timefilter.getBounds();
  const [min] = useState(bounds.min.toISOString());
  const [max] = useState(bounds.max.toISOString());

  const [clusters, setClusters] = useState([] as any);
  const [loaded, setLoaded] = useState<boolean | null>(false);
  const handleRequestError = useRequestErrorHandler();

  useEffect(() => {
    async function makeRequest() {
      try {
        if (services.http?.fetch) {
          const response = await fetchClusters({
            timeRange: {
              min,
              max,
            },
            fetch: services.http.fetch,
            clusterUuid,
            codePaths,
          });
          setClusters(response);
        }
      } catch (e) {
        handleRequestError(e);
      } finally {
        setLoaded(true);
      }
    }
    makeRequest();
  }, [handleRequestError, clusterUuid, ccs, services.http, codePaths, min, max]);

  return { clusters, loaded };
}
