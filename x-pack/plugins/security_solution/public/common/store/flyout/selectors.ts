/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutLayout, FlyoutState } from '@kbn/expandable-flyout';
import { createSelector } from 'reselect';
import { selectFlyoutLayout } from '@kbn/expandable-flyout';
import type { State } from '..';

const selectSecurityFlyout = (state: State): FlyoutState => state.flyout;

/**
 * Takes a scope as input and returns an object with left, right and preview panels.
 */
export const selectSecurityFlyoutLayout = (scope: string) =>
  createSelector(
    selectSecurityFlyout,
    (state: FlyoutState): FlyoutLayout => selectFlyoutLayout(state, scope)
  );
