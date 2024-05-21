/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import type { State } from '../../../common/store/types';
/**
 * Selector that returns the flyout slice of state
 */
export const selectFlyout = createSelector(
  (state: State) => state.flyout.flyout,
  (flyout) => flyout
);

export const selectEventId = createSelector(selectFlyout, (flyout) => flyout.eventId);
