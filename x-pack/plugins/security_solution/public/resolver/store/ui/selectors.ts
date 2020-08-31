/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { ResolverUIState } from '../../types';
import * as locationSearchModel from '../../models/location_search';
import { defaultParameters } from '../../models/location_search';

/**
 * id of the "current" tree node (fake-focused)
 */
export const ariaActiveDescendant = createSelector(
  (uiState: ResolverUIState) => uiState,
  /* eslint-disable no-shadow */
  ({ ariaActiveDescendant }) => {
    return ariaActiveDescendant;
  }
);

/**
 * id of the currently "selected" tree node
 */
export const selectedNode = createSelector(
  (uiState: ResolverUIState) => uiState,
  /* eslint-disable no-shadow */
  ({ selectedNode }: ResolverUIState) => {
    return selectedNode;
  }
);

/**
 * The legacy `crumbEvent` and `crumbId` parameters.
 * @deprecated
 */
export const breadcrumbParameters = createSelector(
  (state: ResolverUIState) => state.locationSearch,
  (state: ResolverUIState) => state.resolverComponentInstanceID,
  (locationSearch, resolverComponentInstanceID) => {
    if (locationSearch === undefined || resolverComponentInstanceID === undefined) {
      // Equivalent to `null`
      return defaultParameters();
    }
    return locationSearchModel.breadcrumbParameters(locationSearch, resolverComponentInstanceID);
  }
);

/**
 * Which view should show in the panel, as well as what parameters should be used.
 * Calculated using the query string
 */
export const panelViewAndParameters = createSelector();
