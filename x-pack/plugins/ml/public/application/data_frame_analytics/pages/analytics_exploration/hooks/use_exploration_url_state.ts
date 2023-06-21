/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { usePageUrlState } from '@kbn/ml-url-state';
import { ML_PAGES } from '../../../../../../common/constants/locator';
import { ExplorationPageUrlState } from '../../../../../../common/types/locator';
import { SEARCH_QUERY_LANGUAGE } from '../../../../../../common/constants/search';

export function getDefaultExplorationPageUrlState(
  overrides?: Partial<ExplorationPageUrlState>
): ExplorationPageUrlState {
  return {
    queryText: '',
    queryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
    pageIndex: 0,
    pageSize: 25,
    analysis: false,
    evaluation: true,
    feature_importance: true,
    results: true,
    splom: true,
    ...(isPopulatedObject(overrides) ? overrides : {}),
  };
}

interface UsePageUrlState {
  pageKey: typeof ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION;
  pageUrlState: ExplorationPageUrlState;
}

export function useExplorationUrlState(overrides?: Partial<ExplorationPageUrlState>) {
  return usePageUrlState<UsePageUrlState>(
    ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
    getDefaultExplorationPageUrlState(overrides)
  );
}
