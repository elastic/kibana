/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import { useMemo } from 'react';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../../common/store';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useCasesMttr } from './use_cases_mttr';
import { useCriticalAlerts } from './use_critical_alerts';

interface UseSocTrends {
  skip: boolean;
  signalIndexName: string | null;
}

export interface StatState {
  description: string;
  isLoading: boolean;
  percentage: { percent: string | null; color: 'success' | 'danger' | 'hollow'; note: string };
  stat: string;
  testRef: string;
  title: string;
  updatedAt: number;
}

interface SocTrends {
  isUpdating: boolean;
  latestUpdate: number;
  stats: StatState[];
}

export const useSocTrends = ({ skip = false, signalIndexName }: UseSocTrends): SocTrends => {
  const { to, from, setQuery, deleteQuery } = useGlobalTime();
  const { from: fromCompare, to: toCompare } = useDeepEqualSelector((state) =>
    pick(['from', 'to'], inputsSelectors.socTrendsTimeRangeSelector(state))
  );

  const casesMttr = useCasesMttr({
    deleteQuery,
    from,
    fromCompare,
    setQuery,
    skip,
    to,
    toCompare,
  });

  const criticalAlerts = useCriticalAlerts({
    deleteQuery,
    from,
    fromCompare,
    setQuery,
    skip,
    signalIndexName,
    to,
    toCompare,
  });

  const latestUpdate = useMemo(
    () => Math.max(...[casesMttr.updatedAt, criticalAlerts.updatedAt]),
    [casesMttr.updatedAt, criticalAlerts.updatedAt]
  );

  const isUpdating = useMemo(
    () => casesMttr.isLoading || criticalAlerts.isLoading,
    [casesMttr.isLoading, criticalAlerts.isLoading]
  );

  return { stats: [casesMttr, criticalAlerts], isUpdating, latestUpdate };
};
