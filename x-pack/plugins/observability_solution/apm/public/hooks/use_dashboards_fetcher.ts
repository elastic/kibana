/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SearchDashboardsResponse } from '@kbn/dashboard-plugin/public/services/dashboard_content_management/lib/find_dashboards';
import { ApmPluginStartDeps } from '../plugin';
import { FETCH_STATUS } from './use_fetcher';

export interface SearchDashboardsResult {
  data: SearchDashboardsResponse['hits'];
  status: FETCH_STATUS;
}

export function useDashboardFetcher(query?: string): SearchDashboardsResult {
  const {
    services: { dashboard },
  } = useKibana<ApmPluginStartDeps>();

  const [result, setResult] = useState<SearchDashboardsResult>({
    data: [],
    status: FETCH_STATUS.NOT_INITIATED,
  });

  useEffect(() => {
    const getDashboards = async () => {
      setResult({
        data: [],
        status: FETCH_STATUS.LOADING,
      });
      try {
        const findDashboardsService = await dashboard?.findDashboardsService();
        const data = await findDashboardsService.search({
          search: query ?? '',
          size: 1000,
        });

        setResult({
          data: data.hits,
          status: FETCH_STATUS.SUCCESS,
        });
      } catch {
        setResult({
          data: [],
          status: FETCH_STATUS.FAILURE,
        });
      }
    };
    getDashboards();
  }, [dashboard, query]);
  return result;
}
