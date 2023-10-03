/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import * as selectors from '../store/selectors';
import { SideEffectContext } from './side_effect_context';
import { panelViewAndParameters } from '../store/panel_view_and_parameters';
import { userSelectedResolverNode } from '../store/actions';
import type { State } from '../../common/store/types';

/**
 * This custom hook, will maintain the state of the active/selected node with the what the selected nodeID is in url state.
 * This means page refreshes, direct links, back and forward buttons, should always pan to the node defined in the url
 * In the scenario where the nodeList is visible in the panel, there is no selectedNode, but this would naturally default to the origin node based on `serverReturnedResolverData` on initial load and refresh
 * This custom hook should only be called once on resolver load, following that the url nodeID should always equal the selectedNode.  This is currently called in `resolver_without_providers.tsx`.
 */
export function useSyncSelectedNode({ id }: { id: string }) {
  const dispatch = useDispatch();
  const resolverComponentInstanceID = id;
  const locationSearch = useLocation().search;
  const sideEffectors = useContext(SideEffectContext);
  const selectedNode = useSelector((state: State) => selectors.selectedNode(state.analyzer[id]));
  const idToNodeMap = useSelector((state: State) => selectors.graphNodeForID(state.analyzer[id]));

  const currentPanelParameters = panelViewAndParameters({
    locationSearch,
    resolverComponentInstanceID,
  });

  let urlNodeID: string | undefined;

  if (currentPanelParameters.panelView !== 'nodes') {
    urlNodeID = currentPanelParameters.panelParameters.nodeID;
  }

  useEffect(() => {
    // use this for the entire render in order to keep things in sync
    if (urlNodeID && idToNodeMap(urlNodeID) && urlNodeID !== selectedNode) {
      dispatch(
        userSelectedResolverNode({
          id,
          nodeID: urlNodeID,
          time: sideEffectors.timestamp(),
        })
      );
    }
  }, [
    currentPanelParameters.panelView,
    urlNodeID,
    dispatch,
    idToNodeMap,
    selectedNode,
    sideEffectors,
    id,
  ]);
}
