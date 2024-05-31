/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import type { SearchDashboardsResponse } from '@kbn/dashboard-plugin/public/services/dashboard_content_management/lib/find_dashboards';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure',
  NOT_INITIATED = 'not_initiated',
}

export interface SearchDashboardsResult {
  data: SearchDashboardsResponse['hits'];
  status: FETCH_STATUS;
}

export function useDashboardFetcher(query = ''): SearchDashboardsResult {
  const {
    services: { dashboard },
  } = useKibanaContextForPlugin();
  const { notifications } = useKibana();
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
          search: query,
          size: 1000,
        });

        setResult({
          data: data.hits,
          status: FETCH_STATUS.SUCCESS,
        });
      } catch (error) {
        setResult({
          data: [],
          status: FETCH_STATUS.FAILURE,
        });
        notifications.toasts.danger({
          title: i18n.translate('xpack.infra.fetchingDashboards.addFailure.toast.title', {
            defaultMessage: 'Error while fetching dashboards',
          }),
          body: error.message,
        });
      }
    };
    getDashboards();
  }, [dashboard, notifications.toasts, query]);
  return result;
}
