/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { entityIDSafeVersion } from '../../../../common/endpoint/models/event';
import { SafeResolverEvent } from '../../../../common/endpoint/types';

import { ResolverState, DataAccessLayer } from '../../types';
import * as selectors from '../selectors';
import { ResolverAction } from '../actions';
import * as nodeDataModel from '../../models/node_data_model';

const nodeDataLimit = 5000;

export function NodeDataFetcher(
  dataAccessLayer: DataAccessLayer,
  api: MiddlewareAPI<Dispatch<ResolverAction>, ResolverState>
): () => void {
  /**
   * use the selector to determine if we are animating then just return
   * if we aren't animating then check the nodes in view and see if we have requested data
   * for them, if not request the data
   *
   * Have a short circuit condition that checks if the nodes in view returned Sets are the same
   * if they are the same then just return
   *
   * Use date.now() or something similar
   *
   * Need a way to avoid rerequesting the node data, we need a Set or something for
   * the nodes that we are requesting, we can start by just using a variable like
   * lastRenderTime instead of putting it in state for now
   */

  return async () => {
    const state = api.getState();

    const time = Date.now();
    const isAnimating = selectors.isAnimating(state)(time);
    /**
     * Animating only occurs when the camera is snapping to a specific node in the tree
     * it is not set to true when a user is panning. If we are animating let's skip trying to load nodes until
     * the camera has settled.
     */
    if (isAnimating) {
      return;
    }

    const visibleNodes: Set<string> = selectors.visibleNodes(state)(time);
    const nodeData = selectors.nodeData(state);

    // TODO: is there a way to optimize this?

    // Get the visible nodes that we haven't already requested or received data for
    const newIDsToRequest = nodeDataModel.idsNotInBase(nodeData, visibleNodes);
    if (newIDsToRequest.size <= 0) {
      return;
    }

    /**
     * Dispatch an action indicating that we are going to request data for a set of nodes so that we can show a loading
     * state for those nodes in the UI.
     */
    api.dispatch({
      type: 'appRequestingNodeData',
      payload: {
        requestedIDs: newIDsToRequest,
      },
    });

    let results: SafeResolverEvent[] | undefined;
    try {
      results = await dataAccessLayer.nodeData({
        ids: Array.from(newIDsToRequest),
        timerange: {
          // TODO: use the timerange plumbing
          from: new Date(2020, 10, 1),
          to: new Date(2020, 10, 30),
        },
        indexPatterns: ['logs-*'],
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
      // group the returned events by their ID
      const newData = new Map<string, SafeResolverEvent[]>();
      for (const result of results) {
        const id = entityIDSafeVersion(result);
        if (id) {
          const events = newData.get(id);
          if (!events) {
            newData.set(id, [result]);
          } else {
            events.push(result);
          }
        }
      }

      /**
       * Dispatch an action including the new node data we received and the original IDs we requested. We might
       * not have received events for each node so the original IDs will help with identifying nodes that we have
       * no data for.
       */
      api.dispatch({
        type: 'serverReturnedNodeData',
        payload: {
          nodeData: newData,
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
          reachedLimit: results.length >= nodeDataLimit,
        },
      });
    }
  };
}
