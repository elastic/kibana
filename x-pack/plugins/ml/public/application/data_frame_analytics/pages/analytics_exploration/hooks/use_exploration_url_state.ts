/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePageUrlState } from '../../../../util/url_state';
import { ML_PAGES } from '../../../../../../common/constants/ml_url_generator';
import { SEARCH_QUERY_LANGUAGE } from '../../../../../../common/constants/search';
import { ExplorationPageUrlState } from '../../../../../../common/types/ml_url_generator';
import { isPopulatedObject } from '../../../../../../common/util/object_utils';

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
    hyperparameter_importance: true,
    results: true,
    splom: true,
    ...(isPopulatedObject(overrides) ? overrides : {}),
  };
}

export function useExplorationUrlState(overrides?: Partial<ExplorationPageUrlState>) {
  return usePageUrlState<ExplorationPageUrlState>(
    ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
    getDefaultExplorationPageUrlState(overrides)
  );
}
