/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { decode, encode } from 'rison-node';

import { createSelector } from 'reselect';
import { PanelViewAndParameters, ResolverUIState } from '../../types';
import { ResolverEvent } from '../../../../common/endpoint/types';
import { isPanelViewAndParameters } from '../../models/location_search';
import { eventId } from '../../../../common/endpoint/models/event';

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
    const decodedValue: unknown = decode(value);
    if (isPanelViewAndParameters(decodedValue)) {
      return decodedValue;
    }
    return defaultParameters();
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
          panelView: 'nodeEventsOfType',
          panelParameters: {
            nodeID,
            eventType: category,
          },
        };
        hrefsByCategory.set(category, relativeHref(categoryPanelParams));
        return category;
      });
    }
    return hrefsByCategory;
  };
});

/**
 * Returns a map of event entity ids to urls for use in navigation.
 */
export const relatedEventDetailHrefs: (
  state: ResolverUIState
) => (
  category: string,
  nodeID: string,
  events: ResolverEvent[]
) => Map<string, string | undefined> = createSelector(relativeHref, (relativeHref) => {
  return (category: string, nodeID: string, events: ResolverEvent[]) => {
    const hrefsByEntityID = new Map<string, string | undefined>();
    events.map((event) => {
      const entityID = String(eventId(event));
      const eventDetailPanelParams: PanelViewAndParameters = {
        panelView: 'eventDetail',
        panelParameters: {
          nodeID,
          eventType: category,
          eventID: entityID,
        },
      };
      hrefsByEntityID.set(entityID, relativeHref(eventDetailPanelParams));
      return event;
    });
    return hrefsByEntityID;
  };
});

/**
 * The parameter name that we use to read/write state to the query string
 */
export function parameterName(resolverComponentInstanceID: string): string {
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
