/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';

import type { Rule } from '../../rule_management/logic/types';
import { useGetInstalledJob } from '../../../common/components/ml/hooks/use_get_jobs';
import { useFetchIndex } from '../../../common/containers/source';
import { useSourcererDataView } from '../../../common/containers/sourcerer';

export interface ReturnUseFetchExceptionFlyoutData {
  isLoading: boolean;
  readonly indexPatterns: DataView | undefined;
}

/**
 * Hook for fetching the fields to be used for populating the exception
 * item conditions options.
 *
 */
export const useFetchIndexPatterns = (rules: Rule[] | null): ReturnUseFetchExceptionFlyoutData => {
  const { dataViewId } = useSourcererDataView();
  const isSingleRule = useMemo(() => rules != null && rules.length === 1, [rules]);
  const isMLRule = useMemo(
    () => rules != null && isSingleRule && rules[0].type === 'machine_learning',
    [isSingleRule, rules]
  );

  // If data view is defined, it superceeds use of rule defined index patterns.
  // If no rule is available, use fields from default data view id.
  const memoDataViewId = useMemo(
    () => (rules != null && isSingleRule ? rules[0].data_view_id || null : dataViewId),
    [rules, isSingleRule, dataViewId]
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
  const memoRuleIndicesOrDvId = useMemo(() => {
    if (isMLRule && jobs.length > 0) {
      return jobs[0].results_index_name ? [`.ml-anomalies-${jobs[0].results_index_name}`] : [];
    } else if (memoDataViewId != null) {
      return memoDataViewId;
    } else {
      return memoNonDataViewIndexPatterns;
    }
  }, [jobs, isMLRule, memoDataViewId, memoNonDataViewIndexPatterns]);

  const [isIndexPatternLoading, { dataView }] = useFetchIndex(
    memoRuleIndicesOrDvId,
    false,
    'indexFields',
    true
  );

  return {
    isLoading: isIndexPatternLoading || mlJobLoading,
    indexPatterns: {
      ...dataView,
      // @ts-expect-error fields is the wrong type but it will take too much effort
      // right now to fix because of how deep the type changes need to be. Since the
      // code only relies on the properties of the fields and not any of the CRUD functions,
      // we typecast the fields to FieldSpec and return the rest of the data view
      fields: dataView != null ? Object.values(dataView.fields.toSpec()) : [],
    },
  };
};
