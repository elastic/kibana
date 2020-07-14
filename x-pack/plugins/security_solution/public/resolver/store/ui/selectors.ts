/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { ResolverUIState } from '../../types';

/**
 * id of the "current" tree node (fake-focused)
 */
export const activeDescendantId = createSelector(
  (uiState: ResolverUIState) => uiState,
  /* eslint-disable no-shadow */
  ({ activeDescendantId }) => {
    return activeDescendantId;
  }
);

/**
 * id of the currently "selected" tree node
 */
export const selectedDescendantId = createSelector(
  (uiState: ResolverUIState) => uiState,
  /* eslint-disable no-shadow */
  ({ selectedDescendantId }) => {
    return selectedDescendantId;
  }
);

/**
 * id of the currently "selected" tree node
 */
export const selectedDescendantProcessId = createSelector(
  (uiState: ResolverUIState) => uiState,
  /* eslint-disable no-shadow */
  ({ processEntityIdOfSelectedDescendant }: ResolverUIState) => {
    return processEntityIdOfSelectedDescendant;
  }
);
