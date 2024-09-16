/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import type { SyntheticsAppState } from '../root_reducer';

const uiStateSelector = (appState: SyntheticsAppState) => appState.ui;

export const selectAlertFlyoutVisibility = createSelector(
  uiStateSelector,
  ({ ruleFlyoutVisible }) => ruleFlyoutVisible
);

export const selectIsNewRule = createSelector(
  uiStateSelector,
  ({ isNewRuleFlyout }) => isNewRuleFlyout
);