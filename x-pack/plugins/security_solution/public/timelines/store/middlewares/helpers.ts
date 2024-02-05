/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { State } from '../../../common/store/types';
import { ALL_TIMELINE_QUERY_ID } from '../../containers/all';
import type { inputsModel } from '../../../common/store/inputs';
import { inputsSelectors } from '../../../common/store/inputs';

/**
 * Refreshes all timelines, so changes are propagated to everywhere on the page
 */
export function refreshTimelines(state: State) {
  const allTimelineQuery = inputsSelectors.globalQueryByIdSelector()(state, ALL_TIMELINE_QUERY_ID);
  if (allTimelineQuery.refetch != null) {
    (allTimelineQuery.refetch as inputsModel.Refetch)();
  }
}
