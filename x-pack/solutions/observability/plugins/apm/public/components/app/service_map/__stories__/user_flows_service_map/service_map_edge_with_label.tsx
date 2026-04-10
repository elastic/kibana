/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';

export interface ServiceMapEdgeWithLabelData {
  label?: string;
  isDanger?: boolean;
  isDashed?: boolean;
  isBidirectional?: boolean;
  /** When true, apply class for CSS animation (e.g. marching ants on problem path). */
  animated?: boolean;
}

const DEFAULT_COLOR = '#c8c8c8';
const DANGER_COLOR = '#BD271E';

export const ServiceMapEdgeWithLabel = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    markerStart,
    data = {},
  }: EdgeProps) => {
    const { euiTheme } = useEuiTheme();
    const edgeData = data as ServiceMapEdgeWithLabelData;
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const isDanger = edgeData?.isDanger ?? false;
    const isDashed = edgeData?.isDashed ?? false;
    const isAnimated = edgeData?.animated ?? false;
    const strokeColor = isDanger ? DANGER_COLOR : (style?.stroke as string) ?? DEFAULT_COLOR;
    const edgeStyle = {
      ...style,
      stroke: strokeColor,
      strokeWidth: isDanger ? 2 : (style?.strokeWidth as number) ?? 1,
      ...(isDashed ? { strokeDasharray: '6 4' } : {}),
    };

    const markerColor = isDanger
      ? DANGER_COLOR
      : (markerEnd as { color?: string } | undefined)?.color ?? DEFAULT_COLOR;
    const markerEndObj =
      markerEnd && typeof markerEnd === 'object'
        ? { ...(markerEnd as object), color: markerColor }
        : { type: markerEnd, width: 12, height: 12, color: markerColor };

    const edgeContent = (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={edgeStyle}
          markerEnd={
            markerEnd
              ? (markerEndObj as unknown as React.ComponentProps<typeof BaseEdge>['markerEnd'])
              : undefined
          }
          markerStart={markerStart}
        />
        {edgeData?.label != null && edgeData.label !== '' && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                background: euiTheme.colors.backgroundBasePlain,
                border: `1px solid ${isDanger ? DANGER_COLOR : euiTheme.colors.lightShade}`,
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 11,
                fontWeight: 600,
                color: isDanger ? DANGER_COLOR : euiTheme.colors.text,
                pointerEvents: 'none',
                boxShadow: `0 ${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.colors.shadow}`,
              }}
              className="nodrag nopan"
            >
              {edgeData.label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );

    if (isAnimated) {
      return (
        <g
          className="serviceMapEdgeWithLabel--animated"
          data-test-subj="investigation-problem-edge"
        >
          {edgeContent}
        </g>
      );
    }
    return edgeContent;
  }
);

ServiceMapEdgeWithLabel.displayName = 'ServiceMapEdgeWithLabel';
