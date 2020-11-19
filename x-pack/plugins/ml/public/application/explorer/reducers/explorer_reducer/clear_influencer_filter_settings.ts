/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getClearedSelectedAnomaliesState } from '../../explorer_utils';

import { ExplorerState } from './state';

export function clearInfluencerFilterSettings(state: ExplorerState): ExplorerState {
  return {
    ...state,
    filterActive: false,
    filteredFields: [],
    influencersFilterQuery: undefined,
    isAndOperator: false,
    maskAll: false,
    queryString: '',
    tableQueryString: '',
    ...getClearedSelectedAnomaliesState(),
    viewByFromPage: 1,
  };
}
