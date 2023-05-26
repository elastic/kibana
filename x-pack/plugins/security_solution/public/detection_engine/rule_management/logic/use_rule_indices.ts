/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getIndexPatternFromESQLQuery } from '@kbn/es-query';
import { useGetInstalledJob } from '../../../common/components/ml/hooks/use_get_jobs';

export const useRuleIndices = (
  machineLearningJobId?: string[],
  defaultRuleIndices?: string[],
  esqlQuery?: string
) => {
  const memoMlJobIds = useMemo(() => machineLearningJobId ?? [], [machineLearningJobId]);
  const { loading: mlJobLoading, jobs } = useGetInstalledJob(memoMlJobIds);

  const memoRuleIndices = useMemo(() => {
    if (jobs.length > 0) {
      return jobs[0].results_index_name ? [`.ml-anomalies-${jobs[0].results_index_name}`] : [];
    } else if (esqlQuery) {
      return getIndexPatternFromESQLQuery(esqlQuery)
        .split(',')
        .map((index) => index.trim());
    } else {
      return defaultRuleIndices ?? [];
    }
  }, [jobs, defaultRuleIndices, esqlQuery]);

  return { mlJobLoading, ruleIndices: memoRuleIndices };
};
