/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetcher } from '@kbn/observability-plugin/public';
import { fetchMonitorManagementList } from '../../../state';

export const useMonitorName = ({ search = '' }: { search?: string }) => {
  const { data, loading } = useFetcher(() => {
    return fetchMonitorManagementList({
      pageSize: 100,
      pageIndex: 0,
      sortField: 'name.keyword',
      sortOrder: 'asc',
      query: search,
    });
  }, [search]);

  return useMemo(() => {
    const { monitors = [] } = data ?? {};
    const values = monitors.map((monitor) => ({
      label: monitor.attributes.name as string,
      id: monitor.id,
    }));

    return { values, loading };
  }, [data, loading]);
};
