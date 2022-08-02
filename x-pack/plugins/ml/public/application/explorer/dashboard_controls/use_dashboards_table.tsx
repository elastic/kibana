/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiInMemoryTableProps } from '@elastic/eui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import type { DashboardSavedObject } from '@kbn/dashboard-plugin/public';
import { useDashboardService } from '../../services/dashboard_service';
import { useMlKibana } from '../../contexts/kibana';

export interface DashboardItem {
  id: string;
  title: string;
  description: string | undefined;
  attributes: DashboardSavedObject;
}

export type EuiTableProps = EuiInMemoryTableProps<DashboardItem>;

export const useDashboardTable = () => {
  const {
    notifications: { toasts },
  } = useMlKibana();

  const dashboardService = useDashboardService();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchDashboards();

    return () => {
      fetchDashboards.cancel();
    };
  }, []);

  const search: EuiTableProps['search'] = useMemo(() => {
    return {
      onChange: ({ queryText }) => {
        setIsLoading(true);
        fetchDashboards(queryText);
      },
      box: {
        incremental: true,
        'data-test-subj': 'mlDashboardsSearchBox',
      },
    };
  }, []);

  const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>([]);

  const fetchDashboards = useCallback(
    debounce(async (query?: string) => {
      try {
        const response = await dashboardService.fetchDashboards(query);
        const items: DashboardItem[] = response.savedObjects.map((savedObject) => {
          return {
            id: savedObject.id,
            title: savedObject.attributes.title,
            description: savedObject.attributes.description,
            attributes: savedObject.attributes,
          };
        });
        setDashboardItems(items);
      } catch (e) {
        toasts.danger({
          body: e,
        });
      }
      setIsLoading(false);
    }, 500),
    []
  );

  return { dashboardItems, search, isLoading };
};
