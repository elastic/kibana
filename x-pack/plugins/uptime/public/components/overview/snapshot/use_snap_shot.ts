/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { useSelector } from 'react-redux';
import { useGetUrlParams } from '../../../hooks';
import { esKuerySelector } from '../../../state/selectors';
import { UptimeRefreshContext } from '../../../contexts';
import { useFetcher } from '../../../../../observability/public';
import { fetchSnapshotCount } from '../../../state/api';

export const useSnapShotCount = () => {
  const { dateRangeStart, dateRangeEnd, query } = useGetUrlParams();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const esKuery = useSelector(esKuerySelector);

  const { data, loading } = useFetcher(
    () => fetchSnapshotCount({ query, dateRangeStart, dateRangeEnd, filters: esKuery }),
    [dateRangeStart, dateRangeEnd, esKuery, lastRefresh, query]
  );

  return { count: data || { total: 0, up: 0, down: 0 }, loading };
};
