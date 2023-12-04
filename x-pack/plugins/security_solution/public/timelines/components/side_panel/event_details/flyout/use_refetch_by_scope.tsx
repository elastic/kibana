/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { isActiveTimeline } from '../../../../../helpers';
import type { inputsModel } from '../../../../../common/store';
import { inputsSelectors } from '../../../../../common/store';

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
  const getGlobalQueries = inputsSelectors.globalQuery();
  const getTimelineQuery = inputsSelectors.timelineQueryByIdSelector();
  const { globalQuery, timelineQuery } = useDeepEqualSelector((state) => ({
    globalQuery: getGlobalQueries(state),
    timelineQuery: getTimelineQuery(state, scopeId),
  }));

  const refetchQuery = (newQueries: inputsModel.GlobalQuery[]) => {
    newQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  };

  const refetchAll = useCallback(() => {
    if (isActiveTimeline(scopeId)) {
      refetchQuery([timelineQuery]);
    } else {
      refetchQuery(globalQuery);
    }
  }, [scopeId, timelineQuery, globalQuery]);

  return { refetch: refetchAll };
};
