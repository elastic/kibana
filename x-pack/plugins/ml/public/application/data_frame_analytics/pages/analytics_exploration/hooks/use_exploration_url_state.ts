/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { usePageUrlState } from '../../../../util/url_state';
import { ListingPageUrlState } from '../../../../../../common/types/common';
import { ML_PAGES } from '../../../../../../common/constants/ml_url_generator';
import {
  SEARCH_QUERY_LANGUAGE,
  SearchQueryLanguage,
} from '../../../../../../common/constants/search';

export type ExplorationPageUrlState = {
  queryText: string;
  queryLanguage: SearchQueryLanguage;
} & Partial<ListingPageUrlState>;

function getDefaultExplorationPageUrlState(): ExplorationPageUrlState {
  return {
    queryText: '',
    queryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
    pageIndex: 0,
    pageSize: 25,
  };
}

export function useExplorationUrlState() {
  return usePageUrlState<ExplorationPageUrlState>(
    ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
    getDefaultExplorationPageUrlState()
  );
}
