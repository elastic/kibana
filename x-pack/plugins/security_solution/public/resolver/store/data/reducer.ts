/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Draft } from 'immer';
import { reducerWithInitialState } from 'typescript-fsa-reducers';
import type { DataState } from '../../types';
import * as treeFetcherParameters from '../../models/tree_fetcher_parameters';
import * as selectors from './selectors';
import * as nodeEventsInCategoryModel from './node_events_in_category_model';
import * as nodeDataModel from '../../models/node_data';
import { normalizeTimeRange } from '../../../common/utils/normalize_time_range';
import { initialAnalyzerState, immerCase } from '../helpers';
import { appReceivedNewExternalProperties } from '../actions';
import {
  serverReturnedResolverData,
  appRequestedResolverData,
  appAbortedResolverDataRequest,
  serverFailedToReturnResolverData,
  serverReturnedNodeEventsInCategory,
  userRequestedAdditionalRelatedEvents,
  serverFailedToReturnNodeEventsInCategory,
  serverReturnedNodeData,
  userReloadedResolverNode,
  appRequestingNodeData,
  serverFailedToReturnNodeData,
  appRequestedCurrentRelatedEventData,
  serverReturnedCurrentRelatedEventData,
  serverFailedToReturnCurrentRelatedEventData,
  userOverrodeDateRange,
} from './action';

export const dataReducer = reducerWithInitialState(initialAnalyzerState)
  .withHandling(
    immerCase(
      appReceivedNewExternalProperties,
      (
        draft,
        { id, resolverComponentInstanceID, locationSearch, databaseDocumentID, indices, filters }
      ) => {
        const state: Draft<DataState> = draft[id]?.data;
        state.tree = {
          ...state.tree,
          currentParameters: {
            databaseDocumentID,
            indices,
            filters,
          },
        };
        state.resolverComponentInstanceID = resolverComponentInstanceID;
        state.locationSearch = locationSearch;
        state.indices = indices;

        const panelViewAndParameters = selectors.panelViewAndParameters(state);
        if (
          !state.nodeEventsInCategory ||
          !nodeEventsInCategoryModel.isRelevantToPanelViewAndParameters(
            state.nodeEventsInCategory,
            panelViewAndParameters
          )
        ) {
          state.nodeEventsInCategory = undefined;
        }
        return draft;
      }
    )
  )
  .withHandling(
    immerCase(appRequestedResolverData, (draft, { id, parameters }) => {
      const state: Draft<DataState> = draft[id].data;
      // keep track of what we're requesting, this way we know when to request and when not to.
      state.tree = {
        ...state.tree,
        pendingRequestParameters: {
          databaseDocumentID: parameters.databaseDocumentID,
          indices: parameters.indices,
          filters: parameters.filters,
        },
      };
      return draft;
    })
  )
  .withHandling(
    immerCase(appAbortedResolverDataRequest, (draft, { id, parameters }) => {
      const state: Draft<DataState> = draft[id].data;
      if (treeFetcherParameters.equal(parameters, state.tree?.pendingRequestParameters)) {
        // the request we were awaiting was aborted
        state.tree = {
          ...state.tree,
          pendingRequestParameters: undefined,
        };
      }
      return draft;
    })
  )
  .withHandling(
    immerCase(
      serverReturnedResolverData,
      (draft, { id, result, dataSource, schema, parameters, detectedBounds }) => {
        const state: Draft<DataState> = draft[id].data;
        /** Only handle this if we are expecting a response */
        state.tree = {
          ...state.tree,
          /**
           * Store the last received data, as well as the databaseDocumentID it relates to.
           */
          lastResponse: {
            result,
            dataSource,
            schema,
            parameters,
            successful: true,
          },
          // This assumes that if we just received something, there is no longer a pending request.
          // This cannot model multiple in-flight requests
          pendingRequestParameters: undefined,
        };
        state.detectedBounds = detectedBounds;
        return draft;
      }
    )
  )
  .withHandling(
    immerCase(serverFailedToReturnResolverData, (draft, { id }) => {
      /** Only handle this if we are expecting a response */
      const state: Draft<DataState> = draft[id].data;
      if (state.tree?.pendingRequestParameters !== undefined) {
        state.tree = {
          ...state.tree,
          pendingRequestParameters: undefined,
          lastResponse: {
            parameters: state.tree?.pendingRequestParameters,
            successful: false,
          },
        };
      }
      return draft;
    })
  )
  .withHandling(
    immerCase(
      serverReturnedNodeEventsInCategory,
      (draft, { id, events, cursor, nodeID, eventCategory }) => {
        // The data in the action could be irrelevant if the panel view or parameters have changed since the corresponding request was made. In that case, ignore this action.
        const state: Draft<DataState> = draft[id].data;
        if (
          nodeEventsInCategoryModel.isRelevantToPanelViewAndParameters(
            { events, cursor, nodeID, eventCategory },
            selectors.panelViewAndParameters(state)
          )
        ) {
          if (state.nodeEventsInCategory) {
            // If there are already `nodeEventsInCategory` in state then combine those with the new data in the payload.
            const updated = nodeEventsInCategoryModel.updatedWith(state.nodeEventsInCategory, {
              events,
              cursor,
              nodeID,
              eventCategory,
            });
            // The 'updatedWith' method will fail if the old and new data don't represent events from the same node and event category
            if (updated) {
              state.nodeEventsInCategory = {
                ...updated,
              };
            } else {
              // this should never happen. This reducer ensures that any `nodeEventsInCategory` that are in state: DataState are relevant to the `panelViewAndParameters`.
              throw new Error('Could not handle related event data because of an internal error.');
            }
          } else {
            // There is no existing data, use the new data.
            state.nodeEventsInCategory = { events, cursor, nodeID, eventCategory };
          }
          // else the action is stale, ignore it
        }
        return draft;
      }
    )
  )
  .withHandling(
    immerCase(userRequestedAdditionalRelatedEvents, (draft, { id }) => {
      const state: Draft<DataState> = draft[id].data;
      if (state.nodeEventsInCategory) {
        state.nodeEventsInCategory.lastCursorRequested = state.nodeEventsInCategory?.cursor;
      }
      return draft;
    })
  )
  .withHandling(
    immerCase(serverFailedToReturnNodeEventsInCategory, (draft, { id }) => {
      const state: Draft<DataState> = draft[id].data;
      if (state.nodeEventsInCategory) {
        state.nodeEventsInCategory = {
          ...state.nodeEventsInCategory,
          error: true,
        };
      }
      return draft;
    })
  )
  .withHandling(
    immerCase(
      serverReturnedNodeData,
      (draft, { id, nodeData, requestedIDs, numberOfRequestedEvents }) => {
        const state: Draft<DataState> = draft[id].data;
        const updatedNodeData = nodeDataModel.updateWithReceivedNodes({
          storedNodeInfo: state.nodeData,
          receivedEvents: nodeData,
          requestedNodes: requestedIDs,
          numberOfRequestedEvents,
        });
        state.nodeData = updatedNodeData;
        return draft;
      }
    )
  )
  .withHandling(
    immerCase(userReloadedResolverNode, (draft, { id, nodeID }) => {
      const state: Draft<DataState> = draft[id].data;
      const updatedNodeData = nodeDataModel.setReloadedNodes(state.nodeData, nodeID);
      state.nodeData = updatedNodeData;
      return draft;
    })
  )
  .withHandling(
    immerCase(appRequestingNodeData, (draft, { id, requestedIDs }) => {
      const state: Draft<DataState> = draft[id].data;
      const updatedNodeData = nodeDataModel.setRequestedNodes(state.nodeData, requestedIDs);
      state.nodeData = updatedNodeData;
      return draft;
    })
  )
  .withHandling(
    immerCase(serverFailedToReturnNodeData, (draft, { id, requestedIDs }) => {
      const state: Draft<DataState> = draft[id].data;
      const updatedData = nodeDataModel.setErrorNodes(state.nodeData, requestedIDs);
      state.nodeData = updatedData;
      return draft;
    })
  )
  .withHandling(
    immerCase(appRequestedCurrentRelatedEventData, (draft, { id }) => {
      draft[id].data.currentRelatedEvent = {
        loading: true,
        data: null,
      };
      return draft;
    })
  )
  .withHandling(
    immerCase(userOverrodeDateRange, (draft, { id, timeRange: { from, to } }) => {
      if (from && to) {
        const state: Draft<DataState> = draft[id].data;
        if (state.tree?.currentParameters !== undefined) {
          state.tree = {
            ...state.tree,
            currentParameters: {
              ...state.tree.currentParameters,
              filters: {
                from,
                to,
              },
            },
          };
        }
        const normalizedTimeRange = normalizeTimeRange({ from, to });
        draft[id].data.overriddenTimeBounds = normalizedTimeRange;
      }
      return draft;
    })
  )
  .withHandling(
    immerCase(serverReturnedCurrentRelatedEventData, (draft, { id, relatedEvent }) => {
      draft[id].data.currentRelatedEvent = {
        loading: false,
        data: {
          ...relatedEvent,
        },
      };
      return draft;
    })
  )
  .withHandling(
    immerCase(serverFailedToReturnCurrentRelatedEventData, (draft, { id }) => {
      draft[id].data.currentRelatedEvent = {
        loading: false,
        data: null,
      };
      return draft;
    })
  )
  .build();
