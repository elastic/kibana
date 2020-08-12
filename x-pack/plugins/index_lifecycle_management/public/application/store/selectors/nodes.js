/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getNodes = (state) => state.nodes.nodes;

export const getSelectedPrimaryShardCount = (state) => state.nodes.selectedPrimaryShardCount;

export const getSelectedReplicaCount = (state) =>
  state.nodes.selectedReplicaCount !== undefined ? state.nodes.selectedReplicaCount : 1;

export const getSelectedNodeAttrs = (state) => state.nodes.selectedNodeAttrs;

export const getNodesFromSelectedNodeAttrs = (state) => {
  const nodes = getNodes(state)[getSelectedNodeAttrs(state)];
  if (nodes) {
    return nodes.length;
  }
  return null;
};

export const getNodeDetails = (state, selectedNodeAttrs) => {
  return state.nodes.details[selectedNodeAttrs];
};
