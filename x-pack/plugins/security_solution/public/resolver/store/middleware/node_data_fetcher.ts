/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { Dispatch, MiddlewareAPI } from 'redux';
import { entityIDSafeVersion } from '../../../../common/endpoint/models/event';
import { SafeResolverEvent } from '../../../../common/endpoint/types';

import { ResolverState, DataAccessLayer, IDToNodeEvents } from '../../types';
import * as selectors from '../selectors';
import { ResolverAction } from '../actions';

export function NodeDataFetcher(
  dataAccessLayer: DataAccessLayer,
  api: MiddlewareAPI<Dispatch<ResolverAction>, ResolverState>
): () => void {
  let lastVisibleNodes: Set<string> | undefined;

  // Call this after each state change.
  // This fetches the ResolverTree for the current entityID
  // if the entityID changes while
  return async () => {
    const state = api.getState();

    const nodeData: IDToNodeEvents | undefined = selectors.nodeData(state);
    const renderTime: number | undefined = selectors.renderTime(state);
    const newVisibleNodes: Set<string> | undefined = selectors.visibleNodes(state)(renderTime);

    const oldVisibleNodes = lastVisibleNodes;
    // Update this each time before fetching data (or even if we don't fetch data) so that subsequent actions that call this (concurrently) will have up to date info.
    lastVisibleNodes = newVisibleNodes;

    // TODO: check if it is dragging as well
    const isDragging = false;
    if (
      !newVisibleNodes ||
      !nodeData ||
      !renderTime ||
      !isDragging ||
      isEqual(newVisibleNodes, oldVisibleNodes)
    ) {
      return;
    }

    const nodesToFetch: string[] = [];
    for (const id of newVisibleNodes.values()) {
      if (id && !nodeData.has(id)) {
        nodesToFetch.push(id);
      }
    }

    if (nodesToFetch.length <= 0) {
      return;
    }

    // TODO: dispatch an action that contains the nodes that need to be fetched

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
      });
    }

    if (results) {
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
          renderTime,
          nodeData: newData,
        },
      });
    }
  };
}
