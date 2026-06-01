/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import { SERVICE_NODE_CIRCLE_SIZE } from '../../../../common/service_map/constants';

/**
 * Hook that returns a function to compute adjusted edge endpoints.
 * Encapsulates access to React Flow internal nodes and EUI theme values
 * so the edge component doesn't need to manage those concerns.
 */
export function useAdjustedEndpoint() {
  const { getInternalNode } = useReactFlow();
  const { euiTheme } = useEuiTheme();
  const wrapperInset = parseInt(euiTheme.size.m, 10);
  const smallestSize = parseInt(euiTheme.size.xxs, 10);
  const smallerSize = parseInt(euiTheme.size.xs, 10);

  return useCallback(
    (
      nodeId: string,
      x: number,
      y: number,
      refX: number,
      refY: number,
      position: Position
    ): { x: number; y: number } => {
      const node = getInternalNode(nodeId);

      let offset = wrapperInset;

      if (node?.measured) {
        const { width, height } = node.measured;

        if (position === Position.Left || position === Position.Right) {
          offset = Math.max(
            ((width ?? 0) - SERVICE_NODE_CIRCLE_SIZE) / 2 + smallerSize,
            wrapperInset
          );
        } else if (position === Position.Bottom) {
          const nodeHeight = height ?? 0;
          offset = Math.max(
            nodeHeight - SERVICE_NODE_CIRCLE_SIZE / 2 - (wrapperInset - smallestSize) * 3,
            wrapperInset
          );
        }
      }

      if (position === Position.Left || position === Position.Right) {
        return { x: x + (refX > x ? offset : -offset), y };
      }
      return { x, y: y + (refY > y ? offset : -offset) };
    },
    [getInternalNode, wrapperInset, smallestSize, smallerSize]
  );
}
