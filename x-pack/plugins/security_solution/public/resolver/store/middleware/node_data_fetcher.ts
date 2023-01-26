/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, MiddlewareAPI } from 'redux';
import type { SafeResolverEvent } from '../../../../common/endpoint/types';

import type { ResolverState, DataAccessLayer } from '../../types';
import * as selectors from '../selectors';
import type { ResolverAction } from '../actions';

/**
 * Max number of nodes to request from the server
 */
const nodeDataLimit = 5000;

/**
 * This fetcher will request data for the nodes that are in the visible region of the resolver graph. Before fetching
 * the data, it checks to see we already have the data or we're already in the process of getting the data.
 *
 * For Endpoint resolver graphs, the node data will be lifecycle process events.
 */
export function NodeDataFetcher(
  dataAccessLayer: DataAccessLayer,
  api: MiddlewareAPI<Dispatch<ResolverAction>, ResolverState>
): () => void {
  return async () => {
    const state = api.getState();

    /**
     * Using the greatest positive number here so that we will request the node data for the nodes in view
     * before the animation finishes. This will be a better user experience since we'll start the request while
     * the camera is panning and there's a higher chance it'll be finished once the camera finishes panning.
     *
     * This gets the visible nodes that we haven't already requested or received data for
     */
    const newIDsToRequest: Set<string> = selectors.newIDsToRequest(state)(Number.POSITIVE_INFINITY);
    const indices = selectors.eventIndices(state);

    if (newIDsToRequest.size <= 0) {
      return;
    }

    /**
     * Dispatch an action indicating that we are going to request data for a set of nodes so that we can show a loading
     * state for those nodes in the UI.
     *
     * When we dispatch this, this middleware will run again but the visible nodes will be the same, the nodeData
     * state will have the new visible nodes in it, and newIDsToRequest will be an empty set.
     */
    api.dispatch({
      type: 'appRequestingNodeData',
      payload: {
        requestedIDs: newIDsToRequest,
      },
    });

    let results: SafeResolverEvent[] | undefined;
    try {
      const detectedBounds = selectors.detectedBounds(state);
      const timeRangeFilters =
        detectedBounds !== undefined ? undefined : selectors.timeRangeFilters(state);
      results = await dataAccessLayer.nodeData({
        ids: Array.from(newIDsToRequest),
        timeRange: timeRangeFilters,
        indexPatterns: indices,
        limit: nodeDataLimit,
      });
    } catch (error) {
      /**
       * Dispatch an action indicating all the nodes that we failed to retrieve data for
       */
      api.dispatch({
        type: 'serverFailedToReturnNodeData',
        payload: {
          requestedIDs: newIDsToRequest,
        },
      });
    }

    if (results) {
      /**
       * Dispatch an action including the new node data we received and the original IDs we requested. We might
       * not have received events for each node so the original IDs will help with identifying nodes that we have
       * no data for.
       */
      api.dispatch({
        type: 'serverReturnedNodeData',
        payload: {
          nodeData: results,
          requestedIDs: newIDsToRequest,
          /**
           * The reason we need this is to handle the case where the results does not contain node data for each node ID
           * that we requested. This situation can happen for a couple reasons:
           *
           * 1. The data no longer exists in Elasticsearch. This is an unlikely scenario because for us to be requesting
           *  a node ID it means that when we retrieved the initial resolver graph we had at least 1 event so that we could
           *  draw a node using that event on the graph. A user could delete the node's data between the time when we
           *  requested the original graph and now.
           *
           *  In this situation we'll want to record that there is no node data for that specific node but still mark the
           *  status as Received.
           *
           * 2. The request limit for the /events API was received. Currently we pass in 5000 as the limit. If we receive
           *  5000 events back than it is possible that we won't receive a single event for one of the node IDs we requested.
           *  In this scenario we'll want to mark the node in such a way that on a future action we'll try requesting
           *  the data for that particular node. We'll have a higher likelihood of receiving data on subsequent requests
           *  because the number of node IDs that we request will go done as we receive their data back.
           *
           *  In this scenario we'll remove the entry in the node data map so that on a subsequent middleware call
           *  if that node is still in view we'll request its node data.
           */
          numberOfRequestedEvents: nodeDataLimit,
        },
      });
    }
  };
}
