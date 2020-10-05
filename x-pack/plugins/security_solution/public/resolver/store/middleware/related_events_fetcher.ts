/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { isEqual } from 'lodash';
import { ResolverPaginatedEvents, ResolverRelatedEvents } from '../../../../common/endpoint/types';

import { ResolverState, DataAccessLayer, PanelViewAndParameters } from '../../types';
import * as selectors from '../selectors';
import { ResolverAction } from '../actions';

export function RelatedEventsFetcher(
  dataAccessLayer: DataAccessLayer,
  api: MiddlewareAPI<Dispatch<ResolverAction>, ResolverState>
): (action: ResolverAction) => void {
  let last: PanelViewAndParameters | undefined;

  // Call this after each state change.
  // This fetches the ResolverTree for the current entityID
  // if the entityID changes while
  return async (action: ResolverAction) => {
    const state = api.getState();

    const newParams = selectors.panelViewAndParameters(state);
    const oldParams = last;
    // Update this each time before fetching data (or even if we don't fetch data) so that subsequent actions that call this (concurrently) will have up to date info.
    last = newParams;

    // If the panel view params have changed and the current panel view is either `nodeEventsInCategory` or `eventDetail`, then fetch the related events for that nodeID.
    if (!isEqual(newParams, oldParams)) {
      if (newParams.panelView === 'nodeEventsInCategory') {
        const nodeID = newParams.panelParameters.nodeID;

        const result:
          | ResolverPaginatedEvents
          | undefined = await dataAccessLayer.eventsWithEntityIDAndCategory(
          nodeID,
          newParams.panelParameters.eventCategory
        );

        if (result) {
          api.dispatch({
            type: 'serverReturnedNodeEventsInCategory',
            payload: {
              events: result.events,
              eventCategory: newParams.panelParameters.eventCategory,
              cursor: result.nextEvent,
              nodeID,
            },
          });
        }
      } else if (newParams.panelView === 'eventDetail') {
        const nodeID = newParams.panelParameters.nodeID;

        const result: ResolverRelatedEvents | undefined = await dataAccessLayer.relatedEvents(
          nodeID
        );

        if (result) {
          api.dispatch({
            type: 'serverReturnedRelatedEventData',
            payload: result,
          });
        }
      }
    } else if (action.type === 'userRequestedAdditionalRelatedEvents') {
      const nodeEventsInCategory = state.data.nodeEventsInCategory;
      if (nodeEventsInCategory !== undefined) {
        api.dispatch({
          type: 'appRequestedAdditionalRelatedEvents',
          payload: {},
        });
        const { nodeID, eventCategory, cursor } = nodeEventsInCategory;
        let result: ResolverPaginatedEvents | null = null;
        try {
          if (cursor) {
            result = await dataAccessLayer.eventsWithEntityIDAndCategory(
              nodeID,
              eventCategory,
              cursor
            );
          } else {
            result = await dataAccessLayer.eventsWithEntityIDAndCategory(nodeID, eventCategory);
          }
        } catch (error) {
          api.dispatch({
            type: 'serverFailedToReturnNodeEventsInCategory',
          });
        }

        if (result) {
          api.dispatch({
            type: 'serverReturnedNodeEventsInCategory',
            payload: {
              events: result.events,
              eventCategory,
              cursor: result.nextEvent,
              nodeID,
            },
          });
        }
      }
    }
  };
}
