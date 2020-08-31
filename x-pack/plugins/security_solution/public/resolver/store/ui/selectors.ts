/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { decode, encode } from 'rison-node';

import { createSelector } from 'reselect';
import { PanelViewAndParameters, ResolverUIState } from '../../types';
import { isPanelViewAndParameters } from '../../models/location_search';

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
 * Which view should show in the panel, as well as what parameters should be used.
 * Calculated using the query string
 */
export const panelViewAndParameters = createSelector(
  (state: ResolverUIState) => state.locationSearch,
  (state: ResolverUIState) => state.resolverComponentInstanceID,
  (locationSearch, resolverComponentInstanceID) => {
    if (locationSearch === undefined || resolverComponentInstanceID === undefined) {
      // Equivalent to `null`
      return defaultParameters();
    }
    const urlSearchParams = new URLSearchParams(locationSearch);
    const value = urlSearchParams.get(parameterName(resolverComponentInstanceID));
    if (value === null) {
      // Equivalent to `null`
      return defaultParameters();
    }
    const decodedValue = decode(value);
    if (isPanelViewAndParameters(decodedValue)) {
      return decodedValue;
    }
    return defaultParameters();
  }
);

export const relativeHref: (
  state: ResolverUIState
) => (params: PanelViewAndParameters) => string | null = createSelector(
  (state: ResolverUIState) => state.locationSearch,
  (state: ResolverUIState) => state.resolverComponentInstanceID,
  (locationSearch, resolverComponentInstanceID) => {
    return (params: PanelViewAndParameters) => {
      if (locationSearch === undefined || resolverComponentInstanceID === undefined) {
        return null;
      }
      const urlSearchParams = new URLSearchParams(locationSearch);
      const value = encode(params);
      urlSearchParams.set(parameterName(resolverComponentInstanceID), value);
      return urlSearchParams.toString();
    };
  }
);

/**
 * The parameter name that we use to read/write state to the query string
 */
function parameterName(resolverComponentInstanceID: string): string {
  return `resolver-${resolverComponentInstanceID}`;
}
/**
 * The default parameters to use when no (valid) location search is available.
 */
export function defaultParameters(): PanelViewAndParameters {
  // Note, this really should be a selector. it needs to know about the state of the app so it can select
  // the origin event.
  return {
    panelView: 'nodes',
  };
}
