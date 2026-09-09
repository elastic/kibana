/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { BaseEdge, getBezierPath, Position, type EdgeProps } from '@xyflow/react';
import { useServiceMapHighlight } from '../../shared/service_map/service_map_search_context';
import { useAdjustedEndpoint } from './get_highlight_offset';

export const ServiceMapEdge = memo(
  ({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
    markerStart,
    data,
  }: EdgeProps) => {
    const { activeMatchNodeId } = useServiceMapHighlight();
    const adjustEndpoint = useAdjustedEndpoint();

    const sourceHighlighted = Boolean(data?.sourceContextHighlight) || activeMatchNodeId === source;
    const targetHighlighted = Boolean(data?.targetContextHighlight) || activeMatchNodeId === target;

    const { x: sX, y: sY } = sourceHighlighted
      ? adjustEndpoint(source, sourceX, sourceY, targetX, targetY, sourcePosition ?? Position.Right)
      : { x: sourceX, y: sourceY };

    const { x: tX, y: tY } = targetHighlighted
      ? adjustEndpoint(target, targetX, targetY, sourceX, sourceY, targetPosition ?? Position.Left)
      : { x: targetX, y: targetY };

    const [edgePath] = getBezierPath({
      sourceX: sX,
      sourceY: sY,
      sourcePosition,
      targetX: tX,
      targetY: tY,
      targetPosition,
    });

    return (
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        markerEnd={markerEnd}
        markerStart={markerStart}
        data-test-subj={`serviceMapEdge-${id}`}
      />
    );
  }
);

ServiceMapEdge.displayName = 'ServiceMapEdge';
