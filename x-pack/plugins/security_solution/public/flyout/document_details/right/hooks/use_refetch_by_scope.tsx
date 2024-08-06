/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { inputsModel } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { isActiveTimeline } from '../../../../helpers';

export interface UseRefetchScopeQueryParams {
  /**
   * Scope ID
   */
  scopeId: string;
}

/**
 * Hook to refetch data within specified scope
 */
export const useRefetchByScope = ({ scopeId }: UseRefetchScopeQueryParams) => {
  const getGlobalQueries = useMemo(() => inputsSelectors.globalQuery(), []);
  const getTimelineQuery = useMemo(() => inputsSelectors.timelineQueryByIdSelector(), []);
  const { globalQuery, timelineQuery } = useDeepEqualSelector((state) => ({
    globalQuery: getGlobalQueries(state),
    timelineQuery: getTimelineQuery(state, scopeId),
  }));

  const refetchAll = useCallback(() => {
    const refetchQuery = (newQueries: inputsModel.GlobalQuery[]) => {
      newQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
    };
    if (isActiveTimeline(scopeId)) {
      refetchQuery([timelineQuery]);
    } else {
      refetchQuery(globalQuery);
    }
  }, [scopeId, timelineQuery, globalQuery]);

  return { refetch: refetchAll };
};
