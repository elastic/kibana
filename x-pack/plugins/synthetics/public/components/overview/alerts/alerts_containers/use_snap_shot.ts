/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { useUptimeDataView, generateUpdatedKueryString } from '../../../../hooks';
import { fetchSnapshotCount } from '../../../../state/api';

export const useSnapShotCount = ({ query, filters }: { query: string; filters: [] | string }) => {
  const parsedFilters =
    filters === undefined || typeof filters === 'string'
      ? ''
      : JSON.stringify(Array.from(Object.entries(filters)));

  const dataView = useUptimeDataView();

  const [esKuery, error] = generateUpdatedKueryString(dataView, query, parsedFilters);

  const { data, loading } = useFetcher(
    () =>
      fetchSnapshotCount({
        dateRangeStart: 'now-24h',
        dateRangeEnd: 'now',
        filters: error ? undefined : esKuery,
      }),
    [esKuery, query]
  );

  return { count: data || { total: 0, up: 0, down: 0 }, loading };
};
