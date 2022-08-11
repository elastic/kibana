/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import {
  getManageTimelineById,
  getTimelineByIdSelector,
} from '../../../../store/timeline/selectors';

/**
 * This selector combines all the selectors used by the Timeline `StatefulBody`,
 * such that `StatefulBody` retrieves all it's Redux values via a singular
 * usage of `useSelector`
 *
 * @param state - the state of the store as defined by `State` in common/store/types.ts
 * @param id - a timeline id e.g. `timeline-1`
 *
 * Example:
 *  `useSelector((state: State) => timelineBodySelector(state, id))`
 */
export const timelineBodySelector = createSelector(
  getManageTimelineById(),
  getTimelineByIdSelector(),
  (manageTimelineById, timeline) => ({
    manageTimelineById,
    timeline,
  })
);
