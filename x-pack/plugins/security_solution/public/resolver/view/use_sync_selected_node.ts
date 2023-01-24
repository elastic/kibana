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
import type { ResolverAction } from '../store/actions';
import { panelViewAndParameters } from '../store/panel_view_and_parameters';

/**
 * This custom hook, will maintain the state of the active/selected node with the what the selected nodeID is in url state.
 * This means page refreshes, direct links, back and forward buttons, should always pan to the node defined in the url
 * In the scenario where the nodeList is visible in the panel, there is no selectedNode, but this would naturally default to the origin node based on `serverReturnedResolverData` on initial load and refresh
 * This custom hook should only be called once on resolver load, following that the url nodeID should always equal the selectedNode.  This is currently called in `resolver_without_providers.tsx`.
 */
export function useSyncSelectedNode() {
  const dispatch: (action: ResolverAction) => void = useDispatch();
  const resolverComponentInstanceID = useSelector(selectors.resolverComponentInstanceID);
  const locationSearch = useLocation().search;
  const sideEffectors = useContext(SideEffectContext);
  const selectedNode = useSelector(selectors.selectedNode);
  const idToNodeMap = useSelector(selectors.graphNodeForID);

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
      dispatch({
        type: 'userSelectedResolverNode',
        payload: {
          nodeID: urlNodeID,
          time: sideEffectors.timestamp(),
        },
      });
    }
  }, [
    currentPanelParameters.panelView,
    urlNodeID,
    dispatch,
    idToNodeMap,
    selectedNode,
    sideEffectors,
  ]);
}
