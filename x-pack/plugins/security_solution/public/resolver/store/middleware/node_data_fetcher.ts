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
import { hasIDsInNodeInfo } from '../data/node_data_model';

export function NodeDataFetcher(
  dataAccessLayer: DataAccessLayer,
  api: MiddlewareAPI<Dispatch<ResolverAction>, ResolverState>
): () => void {
  let lastRenderTime: number | undefined;
  let lastVisibleNodes: Set<string> | undefined;
  const requestedNodes: Set<string> = new Set();

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
    if (isAnimating) {
      return;
    }

    const visibleNodes: Set<string> = selectors.visibleNodes(state)(time);
    const nodeData = selectors.nodeData(state);

    // TODO: should we check instead that requestedNodes contains all visibleNodes here?
    if (hasIDsInNodeInfo(visibleNodes, nodeData)) {
      return;
    }

    for (const id of visibleNodes.values()) {
    }

    const renderTime: number | undefined = selectors.renderTime(state);

    const oldRenderTime = lastRenderTime;
    // Update this each time before fetching data (or even if we don't fetch data) so that subsequent actions that call this (concurrently) will have up to date info.
    lastRenderTime = renderTime;

    if (!renderTime || renderTime === oldRenderTime) {
      return;
    }

    console.log('calculating visible nodes with time', renderTime);
    const newVisibleNodes: Set<string> = selectors.visibleNodes(state)(renderTime);
    const oldVisibleNodes: Set<string> | undefined = lastVisibleNodes;
    lastVisibleNodes = newVisibleNodes;

    if (isEqual(newVisibleNodes, oldVisibleNodes)) {
      return;
    }

    console.log(
      `visible nodes: ${Array.from(newVisibleNodes.values())} old: ${Array.from(
        oldVisibleNodes?.values() ?? []
      )} is equal: ${isEqual(newVisibleNodes, oldVisibleNodes)}`
    );
    if (newVisibleNodes && oldRenderTime) {
      console.log(`new size: ${newVisibleNodes.size} old size: ${oldVisibleNodes?.size}`);
    }

    // const nodeData: IDToNodeEvents | undefined = selectors.nodeData(state);
    const nodesToFetch: string[] = [];
    for (const id of newVisibleNodes.values()) {
      if (id !== '' && (nodeData === undefined || !nodeData.has(id))) {
        nodesToFetch.push(id);
      }
    }

    if (nodesToFetch.length <= 0) {
      return;
    }

    // TODO: dispatch an action that contains the nodes that need to be fetched so that
    // their visual state can change
    // this is so that we don't creating a loading state for all nodes in the graph only the ones we're requesting
    // info for

    let results: SafeResolverEvent[] | undefined;
    try {
      results = await dataAccessLayer.eventsNodeData({
        ids: nodesToFetch,
        timerange: {
          from: new Date(2020, 10, 1),
          to: new Date(2020, 10, 30),
        },
        indexPatterns: ['logs-*'],
      });
    } catch (error) {
      api.dispatch({
        type: 'serverFailedToReturnNodeData',
      });
    }

    console.log('results ', results);
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
