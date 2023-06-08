/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSecurityJobs } from '../../../common/components/ml_popover/hooks/use_security_jobs';

export const useRuleIndices = (machineLearningJobId?: string[], defaultRuleIndices?: string[]) => {
  const memoMlJobIds = useMemo(() => machineLearningJobId ?? [], [machineLearningJobId]);
  const { loading: mlJobLoading, jobs } = useSecurityJobs();
  const memoSelectedMlJobs = useMemo(
    () => jobs.filter(({ id }) => memoMlJobIds.includes(id)),
    [jobs, memoMlJobIds]
  );
  const memoMlIndices = useMemo(
    () => [
      ...new Set(
        memoSelectedMlJobs.reduce((acc, j) => {
          const patterns = j.defaultIndexPattern.split(',');
          return acc.concat(patterns);
        }, [] as string[])
      ),
    ],
    [memoSelectedMlJobs]
  );

  const memoRuleIndices = useMemo(() => {
    if (memoMlIndices.length > 0) {
      return memoMlIndices;
    } else {
      return defaultRuleIndices ?? [];
    }
  }, [defaultRuleIndices, memoMlIndices]);

  return { mlJobLoading, ruleIndices: memoRuleIndices };
};
