/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPayload } from '../../explorer_dashboard_service';
import { getInfluencers } from '../../explorer_utils';

import { getIndexPattern } from './get_index_pattern';
import type { ExplorerState } from './state';

export const jobSelectionChange = (state: ExplorerState, payload: ActionPayload): ExplorerState => {
  const { selectedJobs } = payload;
  const stateUpdate: ExplorerState = {
    ...state,
    noInfluencersConfigured: getInfluencers(selectedJobs).length === 0,
    selectedJobs,
  };

  // clear filter if selected jobs have no influencers
  if (stateUpdate.noInfluencersConfigured === true) {
    const noFilterState = {
      filterActive: false,
      filteredFields: [],
      influencersFilterQuery: undefined,
      maskAll: false,
      queryString: '',
      tableQueryString: '',
    };

    Object.assign(stateUpdate, noFilterState);
  } else {
    // indexPattern will not be used if there are no influencers so set up can be skipped
    // indexPattern is passed to KqlFilterBar which is only shown if (noInfluencersConfigured === false)
    stateUpdate.indexPattern = getIndexPattern(selectedJobs);
  }

  stateUpdate.loading = true;
  return stateUpdate;
};
