/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../../common/store';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import type { CasesMttrState } from './use_cases_mttr';
import { useCasesMttr } from './use_cases_mttr';

interface UseSocTrends {
  casesMttr: CasesMttrState;
}

export const useSocTrends = ({ skip = false }): UseSocTrends => {
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

  return { casesMttr };
};
