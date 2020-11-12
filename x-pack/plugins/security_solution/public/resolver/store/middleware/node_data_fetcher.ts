/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { Dispatch, MiddlewareAPI } from 'redux';
import { entityIDSafeVersion } from '../../../../common/endpoint/models/event';
import { SafeResolverEvent } from '../../../../common/endpoint/types';

import { ResolverState, DataAccessLayer, NodeDataState } from '../../types';
import * as selectors from '../selectors';
import { ResolverAction } from '../actions';

export function NodeDataFetcher(
  dataAccessLayer: DataAccessLayer,
  api: MiddlewareAPI<Dispatch<ResolverAction>, ResolverState>
): () => void {
  let last: NodeDataState | undefined;

  // Call this after each state change.
  // This fetches the ResolverTree for the current entityID
  // if the entityID changes while
  return async () => {
    const state = api.getState();

    const newParams = selectors.nodeDataState(state);
    const oldParams = last;
    // Update this each time before fetching data (or even if we don't fetch data) so that subsequent actions that call this (concurrently) will have up to date info.
    // TODO: is it possible that the new request is ever undefined when the previous was defined?
    last = newParams;
    if (!newParams || isEqual(newParams.nodesInView, oldParams?.nodesInView)) {
      return;
    }

    const nodesToFetch: string[] = [];
    for (const id of newParams.nodesInView.values()) {
      if (id && !newParams.nodeData.has(id)) {
        nodesToFetch.push(id);
      }
    }

    if (nodesToFetch.length <= 0) {
      return;
    }

    let results: SafeResolverEvent[] | undefined;
    try {
      results = await dataAccessLayer.eventsNodeData({
        ids: nodesToFetch,
        timerange: {
          from: new Date(),
          to: new Date(),
        },
        indexPatterns: ['logs-*'],
      });
    } catch (error) {
      api.dispatch({
        type: 'serverFailedToReturnNodeData',
        payload: {
          nodesInView: newParams.nodesInView,
          nodeData: newParams.nodeData,
        },
      });
    }

    if (results) {
      // TODO: is it better to merge the nodeData here?
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
      api.dispatch({
        type: 'serverReturnedNodeData',
        payload: {
          nodesInView: newParams.nodesInView,
          nodeData: newData,
        },
      });
    }
  };
}
