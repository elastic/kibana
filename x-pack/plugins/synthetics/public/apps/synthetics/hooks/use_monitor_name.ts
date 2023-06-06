/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDebounce } from 'react-use';
import { useFetcher } from '@kbn/observability-shared-plugin/public';

import { ConfigKey } from '../../../../common/constants/monitor_management';
import { fetchMonitorManagementList, MonitorListPageState } from '../state';

export const useMonitorName = ({ search = '' }: { search?: string }) => {
  const { monitorId } = useParams<{ monitorId: string }>();

  const [debouncedSearch, setDebouncedSearch] = useState<string>(search);
  useDebounce(() => setDebouncedSearch(search), 500, [search]);

  const { loading, data: monitors } = useFetcher(async () => {
    const pageState: MonitorListPageState = {
      pageIndex: 0,
      pageSize: 10,
      sortField: `${ConfigKey.NAME}.keyword`,
      sortOrder: 'asc',
      query: debouncedSearch,
    };
    const fetchedResult = await fetchMonitorManagementList(pageState);

    return (fetchedResult?.monitors ?? []).map((monitor) => ({
      label: monitor.attributes.name,
      key: monitor.attributes.config_id,
      locationIds: monitor.attributes.locations.map((location) => location.id),
    }));
  }, [debouncedSearch]);

  return useMemo(() => {
    const searchPattern = search.replace(/\s/g, '').toLowerCase();
    const nameAlreadyExists = Boolean(
      (monitors ?? []).some(
        (monitor) =>
          monitorId !== monitor.key &&
          monitor.label.replace(/\s/g, '').toLowerCase() === searchPattern
      )
    );

    return {
      loading: loading || debouncedSearch !== search, // Also keep busy while waiting for debounce
      nameAlreadyExists,
      values: (monitors ?? []).filter((val) => val.key !== monitorId),
    };
  }, [loading, monitorId, monitors, search, debouncedSearch]);
};
