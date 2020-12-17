/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import * as selectors from '../store/selectors';
import * as nodeModel from '../../../common/endpoint/models/node';
import { SideEffectContext } from './side_effect_context';
import { ResolverState } from '../types';
import { ResolverAction } from '../store/actions';

/**
 * This custom hook, will maintain the state of the active/selected node with the what the selected nodeID is in url state.
 * This means page refreshes, direct links, back and forward buttons, should always pan to the node defined in the url
 * In the scenario where the nodeList is visible in the panel, there is no selectedNode, but this would naturally default to the origin node based on `serverReturnedResolverData` on initial load and refresh
 * This custom hook should only be called once on resolver load, following that the url nodeID should always equal the selectedNode.  This is currently called in `resolver_without_providers.tsx`.
 */
export function useSyncSelectedNode() {
  const dispatch: (action: ResolverAction) => void = useDispatch();
  const { timestamp } = useContext(SideEffectContext);
  const currentPanelParameters = useSelector(selectors.panelViewAndParameters);
  const selectedNode = useSelector(selectors.selectedNode);

  // Get all the nodeIDs to confirm that the node we are attempting to pan to actually exists
  const allNodeIDs: string[] = useSelector(
    useCallback((state: ResolverState) => {
      const allNodes = selectors.graphableNodes(state);
      const allNodeIds = [];
      for (const node of allNodes) {
        const nodeID = nodeModel.nodeID(node);
        if (nodeID) allNodeIds.push(nodeID);
      }
      return allNodeIds;
    }, [])
  );

  useEffect(() => {
    if (currentPanelParameters && currentPanelParameters.panelView !== 'nodes') {
      const { nodeID } = currentPanelParameters.panelParameters;
      if (nodeID && allNodeIDs.includes(nodeID) && nodeID !== selectedNode) {
        dispatch({
          type: 'userBroughtNodeIntoView',
          payload: {
            nodeID,
            time: timestamp(),
          },
        });
      }
    }
  }, [allNodeIDs, currentPanelParameters, dispatch, selectedNode, timestamp]);
}
