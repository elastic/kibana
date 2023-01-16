/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useMemo } from 'react';
import type { DataViewBase } from '@kbn/es-query';

import type { Rule } from '../../rule_management/logic/types';
import { useGetInstalledJob } from '../../../common/components/ml/hooks/use_get_jobs';
import { useKibana } from '../../../common/lib/kibana';
import { useFetchIndex } from '../../../common/containers/source';

export interface ReturnUseFetchExceptionFlyoutData {
  isLoading: boolean;
  indexPatterns: DataViewBase;
}

/**
 * Hook for fetching the fields to be used for populating the exception
 * item conditions options.
 *
 */
export const useFetchIndexPatterns = (rules: Rule[] | null): ReturnUseFetchExceptionFlyoutData => {
  const { data, spaces } = useKibana().services;
  const [dataViewLoading, setDataViewLoading] = useState(false);
  const [activeSpaceId, setActiveSpaceId] = useState('');
  const isSingleRule = useMemo(() => rules != null && rules.length === 1, [rules]);
  const isMLRule = useMemo(
    () => rules != null && isSingleRule && rules[0].type === 'machine_learning',
    [isSingleRule, rules]
  );

  useEffect(() => {
    const fetchAndSetActiveSpace = async () => {
      if (spaces) {
        const aSpace = await spaces.getActiveSpace();
        setActiveSpaceId(aSpace.id);
      }
    };
    fetchAndSetActiveSpace();
  }, [spaces]);
  // If data view is defined, it superceeds use of rule defined index patterns.
  // If no rule is available, use fields from default data view id.
  const memoDataViewId = useMemo(
    () =>
      rules != null && isSingleRule
        ? rules[0].data_view_id || null
        : `security-solution-${activeSpaceId}`,
    [isSingleRule, rules, activeSpaceId]
  );

  const memoNonDataViewIndexPatterns = useMemo(
    () =>
      !memoDataViewId && rules != null && isSingleRule && rules[0].index != null
        ? rules[0].index
        : [],
    [memoDataViewId, isSingleRule, rules]
  );

  // Index pattern logic for ML
  const memoMlJobIds = useMemo(
    () => (isMLRule && isSingleRule && rules != null ? rules[0].machine_learning_job_id ?? [] : []),
    [isMLRule, isSingleRule, rules]
  );
  const { loading: mlJobLoading, jobs } = useGetInstalledJob(memoMlJobIds);

  // We only want to provide a non empty array if it's an ML rule and we were able to fetch
  // the index patterns, or if it's a rule not using data views. Otherwise, return an empty
  // empty array to avoid making the `useFetchIndex` call
  const memoRuleIndices = useMemo(() => {
    if (isMLRule && jobs.length > 0) {
      return jobs[0].results_index_name ? [`.ml-anomalies-${jobs[0].results_index_name}`] : [];
    } else if (memoDataViewId != null) {
      return [];
    } else {
      return memoNonDataViewIndexPatterns;
    }
  }, [jobs, isMLRule, memoDataViewId, memoNonDataViewIndexPatterns]);

  const [isIndexPatternLoading, { indexPatterns: indexIndexPatterns }] =
    useFetchIndex(memoRuleIndices);

  // Data view logic
  const [dataViewIndexPatterns, setDataViewIndexPatterns] = useState<DataViewBase | null>(null);
  useEffect(() => {
    const fetchSingleDataView = async () => {
      // ensure the memoized data view includes a space id, otherwise
      // we could be trying to fetch a data view that does not exist, which would
      // throw an error here.
      if (activeSpaceId !== '' && memoDataViewId) {
        setDataViewLoading(true);
        const dv = await data.dataViews.get(memoDataViewId);
        setDataViewLoading(false);
        setDataViewIndexPatterns(dv);
      }
    };

    fetchSingleDataView();
  }, [memoDataViewId, data.dataViews, setDataViewIndexPatterns, activeSpaceId]);

  // Determine whether to use index patterns or data views
  const indexPatternsToUse = useMemo(
    (): DataViewBase =>
      memoDataViewId && dataViewIndexPatterns != null ? dataViewIndexPatterns : indexIndexPatterns,
    [memoDataViewId, dataViewIndexPatterns, indexIndexPatterns]
  );

  return {
    isLoading: isIndexPatternLoading || mlJobLoading || dataViewLoading,
    indexPatterns: indexPatternsToUse,
  };
};
