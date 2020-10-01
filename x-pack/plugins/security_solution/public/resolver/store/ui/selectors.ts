/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { encode } from 'rison-node';

import { createSelector } from 'reselect';
import { PanelViewAndParameters, ResolverUIState } from '../../types';
import { panelViewAndParameters as panelViewAndParametersFromLocationSearchAndResolverComponentInstanceID } from '../panel_view_and_parameters';
import { parameterName } from '../parameter_name';

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
    return panelViewAndParametersFromLocationSearchAndResolverComponentInstanceID({
      locationSearch,
      resolverComponentInstanceID,
    });
  }
);

/**
 * Return a relative href (which includes just the 'search' part) that contains an encoded version of `params `.
 * All other values in the 'search' will be kept.
 * Use this to get an `href` for an anchor tag.
 */
export const relativeHref: (
  state: ResolverUIState
) => (params: PanelViewAndParameters) => string | undefined = createSelector(
  (state: ResolverUIState) => state.locationSearch,
  (state: ResolverUIState) => state.resolverComponentInstanceID,
  (locationSearch, resolverComponentInstanceID) => {
    return (params: PanelViewAndParameters) => {
      /**
       * This is only possible before the first `'appReceivedNewExternalProperties'` action is fired.
       */
      if (locationSearch === undefined || resolverComponentInstanceID === undefined) {
        return undefined;
      }
      const urlSearchParams = new URLSearchParams(locationSearch);
      const value = encode(params);
      urlSearchParams.set(parameterName(resolverComponentInstanceID), value);
      return `?${urlSearchParams.toString()}`;
    };
  }
);

/**
 * Returns a map of ecs category name to urls for use in panel navigation.
 * @deprecated use `useLinkProps`
 */
export const relatedEventsRelativeHrefs: (
  state: ResolverUIState
) => (
  categories: Record<string, number> | undefined,
  nodeID: string
) => Map<string, string | undefined> = createSelector(relativeHref, (relativeHref) => {
  return (categories: Record<string, number> | undefined, nodeID: string) => {
    const hrefsByCategory = new Map<string, string | undefined>();
    if (categories !== undefined) {
      Object.keys(categories).map((category) => {
        const categoryPanelParams: PanelViewAndParameters = {
          panelView: 'nodeEventsInCategory',
          panelParameters: {
            nodeID,
            eventCategory: category,
          },
        };
        hrefsByCategory.set(category, relativeHref(categoryPanelParams));
        return category;
      });
    }
    return hrefsByCategory;
  };
});
