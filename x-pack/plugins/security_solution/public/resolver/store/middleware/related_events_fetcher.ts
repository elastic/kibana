/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { isEqual } from 'lodash';
import { ResolverPaginatedEvents } from '../../../../common/endpoint/types';

import { ResolverState, DataAccessLayer, PanelViewAndParameters } from '../../types';
import * as selectors from '../selectors';
import { ResolverAction } from '../actions';

export function RelatedEventsFetcher(
  dataAccessLayer: DataAccessLayer,
  api: MiddlewareAPI<Dispatch<ResolverAction>, ResolverState>
): () => void {
  let last: PanelViewAndParameters | undefined;

  // Call this after each state change.
  // This fetches the ResolverTree for the current entityID
  // if the entityID changes while
  return async () => {
    const state = api.getState();

    const newParams = selectors.panelViewAndParameters(state);
    const isLoadingMoreEvents = selectors.isLoadingMoreNodeEventsInCategory(state);
    const oldParams = last;
    // Update this each time before fetching data (or even if we don't fetch data) so that subsequent actions that call this (concurrently) will have up to date info.
    last = newParams;

    async function fetchEvents({
      nodeID,
      eventCategory,
      cursor,
      dataRequestID,
    }: {
      nodeID: string;
      eventCategory: string;
      cursor: string | null;
      dataRequestID?: number;
    }) {
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
          payload: {
            nodeID,
            eventCategory,
            cursor,
          },
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
            dataRequestID,
          },
        });
      }
    }
    const oldID = selectors.currentNodeEventsInCategoryRequestID(state);
    const newID = state.data.dataRefreshRequestsMade;
    const shouldRefetch = oldID !== undefined && newID !== undefined && oldID !== newID;
    // If the panel view params have changed and the current panel view is either `nodeEventsInCategory` or `eventDetail`, then fetch the related events for that nodeID.
    if (!isEqual(newParams, oldParams) || shouldRefetch) {
      if (newParams.panelView === 'nodeEventsInCategory') {
        const nodeID = newParams.panelParameters.nodeID;
        const dataRequestID = state.data.dataRefreshRequestsMade;
        api.dispatch({
          type: 'appRequestedNodeEventsInCategory',
          payload: {
            ...newParams,
            dataRequestID,
          },
        });
        fetchEvents({
          nodeID,
          eventCategory: newParams.panelParameters.eventCategory,
          cursor: null,
          // only use the id for initial requests, reuse for load more.
          dataRequestID,
        });
      }
    } else if (isLoadingMoreEvents) {
      const nodeEventsInCategory = state.data.nodeEventsInCategory;
      if (nodeEventsInCategory !== undefined) {
        fetchEvents(nodeEventsInCategory);
      }
    }
  };
}
