/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { DataState } from '../../types';
import { ResolverAction } from '../actions';
import * as treeFetcherParameters from '../../models/tree_fetcher_parameters';
import * as selectors from './selectors';
import * as nodeEventsInCategoryModel from './node_events_in_category_model';

const initialState: DataState = {
  currentRelatedEvent: {
    loading: false,
    data: null,
  },
  relatedEvents: new Map(),
  resolverComponentInstanceID: undefined,
  dataInvalidatedCount: 0,
};
/* eslint-disable complexity */
export const dataReducer: Reducer<DataState, ResolverAction> = (state = initialState, action) => {
  if (action.type === 'appReceivedNewExternalProperties') {
    const requestsMade = state.dataInvalidatedCount;
    let dataInvalidatedCount: number;
    if (action.payload.shouldUpdate) {
      dataInvalidatedCount = requestsMade !== undefined ? requestsMade + 1 : 0;
    } else {
      dataInvalidatedCount = requestsMade !== undefined ? requestsMade : 0;
    }
    const nextState: DataState = {
      ...state,
      dataInvalidatedCount,
      tree: {
        ...state.tree,
        currentParameters: {
          databaseDocumentID: action.payload.databaseDocumentID,
          indices: action.payload.indices,
        },
      },
      resolverComponentInstanceID: action.payload.resolverComponentInstanceID,
      locationSearch: action.payload.locationSearch,
      filters: action.payload.filters,
    };
    const panelViewAndParameters = selectors.panelViewAndParameters(nextState);
    return {
      ...nextState,
      // If the panel view or parameters have changed, the `nodeEventsInCategory` may no longer be relevant. In that case, remove them.
      nodeEventsInCategory:
        nextState.nodeEventsInCategory &&
        nodeEventsInCategoryModel.isRelevantToPanelViewAndParameters(
          nextState.nodeEventsInCategory,
          panelViewAndParameters
        )
          ? nextState.nodeEventsInCategory
          : undefined,
    };
  } else if (action.type === 'appRequestedResolverData') {
    // keep track of what we're requesting, this way we know when to request and when not to.
    const nextState: DataState = {
      ...state,
      tree: {
        ...state.tree,
        pendingRequestParameters: {
          databaseDocumentID: action.payload.databaseDocumentID,
          indices: action.payload.indices,
          dataRequestID: action.payload.dataRequestID,
        },
      },
    };
    return nextState;
  } else if (action.type === 'appAbortedResolverDataRequest') {
    if (treeFetcherParameters.equal(action.payload, state.tree?.pendingRequestParameters)) {
      // the request we were awaiting was aborted
      const nextState: DataState = {
        ...state,
        tree: {
          ...state.tree,
          pendingRequestParameters: undefined,
        },
      };
      return nextState;
    } else {
      return state;
    }
  } else if (action.type === 'serverReturnedResolverData') {
    /** Only handle this if we are expecting a response */
    const nextState: DataState = {
      ...state,
      tree: {
        ...state.tree,
        /**
         * Store the last received data, as well as the databaseDocumentID it relates to.
         */
        lastResponse: {
          result: action.payload.result,
          parameters: action.payload.parameters,
          successful: true,
        },

        // This assumes that if we just received something, there is no longer a pending request.
        // This cannot model multiple in-flight requests
        pendingRequestParameters: undefined,
      },
    };
    return nextState;
  } else if (action.type === 'serverFailedToReturnResolverData') {
    /** Only handle this if we are expecting a response */
    if (state.tree?.pendingRequestParameters !== undefined) {
      const nextState: DataState = {
        ...state,
        tree: {
          ...state.tree,
          pendingRequestParameters: undefined,
          lastResponse: {
            parameters: state.tree.pendingRequestParameters,
            successful: false,
          },
        },
      };
      return nextState;
    } else {
      return state;
    }
  } else if (action.type === 'serverReturnedRelatedEventData') {
    const nextState: DataState = {
      ...state,
      relatedEvents: new Map([...state.relatedEvents, [action.payload.entityID, action.payload]]),
    };
    return nextState;
  } else if (action.type === 'serverReturnedNodeEventsInCategory') {
    // The data in the action could be irrelevant if the panel view or parameters have changed since the corresponding request was made. In that case, ignore this action.
    if (
      nodeEventsInCategoryModel.isRelevantToPanelViewAndParameters(
        action.payload,
        selectors.panelViewAndParameters(state)
      )
    ) {
      if (state.nodeEventsInCategory) {
        // If there are already `nodeEventsInCategory` in state then combine those with the new data in the payload.
        const updated = nodeEventsInCategoryModel.updatedWith(
          state.nodeEventsInCategory,
          action.payload
        );
        // The 'updatedWith' method will fail if the old and new data don't represent events from the same node and event category
        if (updated) {
          const next: DataState = {
            ...state,
            nodeEventsInCategory: updated,
          };
          return next;
        } else {
          // this should never happen. This reducer ensures that any `nodeEventsInCategory` that are in state are relevant to the `panelViewAndParameters`.
          throw new Error('Could not handle related event data because of an internal error.');
        }
      } else {
        // There is no existing data, use the new data.
        const next: DataState = {
          ...state,
          nodeEventsInCategory: action.payload,
        };
        return next;
      }
    } else {
      // the action is stale, ignore it
      return state;
    }
  } else if (action.type === 'userRequestedAdditionalRelatedEvents') {
    if (state.nodeEventsInCategory) {
      const nextState: DataState = {
        ...state,
        nodeEventsInCategory: {
          ...state.nodeEventsInCategory,
          lastCursorRequested: state.nodeEventsInCategory?.cursor,
        },
      };
      return nextState;
    } else {
      return state;
    }
  } else if (action.type === 'serverFailedToReturnNodeEventsInCategory') {
    if (state.nodeEventsInCategory) {
      const nextState: DataState = {
        ...state,
        nodeEventsInCategory: {
          ...state.nodeEventsInCategory,
          error: true,
        },
      };
      return nextState;
    } else {
      return state;
    }
  } else if (action.type === 'appRequestedCurrentRelatedEventData') {
    const nextState: DataState = {
      ...state,
      currentRelatedEvent: {
        loading: true,
        data: null,
      },
    };
    return nextState;
  } else if (action.type === 'serverReturnedCurrentRelatedEventData') {
    const nextState: DataState = {
      ...state,
      currentRelatedEvent: {
        loading: false,
        data: action.payload,
      },
    };
    return nextState;
  } else if (action.type === 'serverFailedToReturnCurrentRelatedEventData') {
    const nextState: DataState = {
      ...state,
      currentRelatedEvent: {
        loading: false,
        data: null,
      },
    };
    return nextState;
  } else {
    return state;
  }
};
