/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { State, Action } from '../types';
import { nodeRegistry } from '../nodes';

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CREATE_NODE':
      const highestNodeId = Object.values(state.nodes)
        .map(n => n.id)
        .reduce((prev, current) => {
          return Math.max(prev, parseInt(current, 10));
        }, 1);
      const nodeId = String(highestNodeId + 1);

      return {
        ...state,
        nodes: {
          ...state.nodes,
          [nodeId]: {
            id: nodeId,
            type: action.nodeType,
            state: nodeRegistry[action.nodeType].initialize(),
            inputNodeIds: action.inputNodeIds,
          },
        },
      };
    case 'SET_NODE':
      const node = state.nodes[action.nodeId];
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.nodeId]: { ...node, state: action.newState },
        },
      };
    case 'DELETE_NODES':
      const nodeCopy = { ...state.nodes };
      action.nodeIds.forEach(id => {
        delete nodeCopy[id];
      });
      return {
        ...state,
        nodes: nodeCopy,
      };
    case 'LOADING_START':
      return {
        ...state,
        loading: true,
      };
    case 'LOADING_SUCCESS':
      return {
        ...state,
        loading: 'success',
      };
    case 'LOADING_FAILURE':
      return {
        ...state,
        loading: 'success',
      };
    default:
      return state;
  }
}
