/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useMemo } from 'react';
import { useRequestEventCounts } from './use_request_event_counts';
import { emptyEventCountsByDataset } from './helpers';
import { CtiEnabledModuleProps } from '../../components/overview_cti_links/cti_enabled_module';

export const ID = 'ctiEventCountQuery';

export const useCtiEventCounts = ({ deleteQuery, from, setQuery, to }: CtiEnabledModuleProps) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [loading, { data, inspect, totalCount, refetch }] = useRequestEventCounts(to, from);

  const eventCountsByDataset = useMemo(
    () =>
      data.reduce(
        (acc, item) => {
          if (item.y && item.g) {
            const id = item.g;
            acc[id] += item.y;
          }
          return acc;
        },
        { ...emptyEventCountsByDataset } as { [key: string]: number }
      ),
    [data]
  );

  useEffect(() => {
    if (isInitialLoading && data) {
      setIsInitialLoading(false);
    }
  }, [isInitialLoading, data]);

  useEffect(() => {
    if (!loading && !isInitialLoading) {
      setQuery({ id: ID, inspect, loading, refetch });
    }
  }, [setQuery, inspect, loading, refetch, isInitialLoading, setIsInitialLoading]);

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, [deleteQuery]);

  useEffect(() => {
    refetch();
  }, [to, from, refetch]);

  return {
    eventCountsByDataset,
    loading,
    totalCount,
  };
};
