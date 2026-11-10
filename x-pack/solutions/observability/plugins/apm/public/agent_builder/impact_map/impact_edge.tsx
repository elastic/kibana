/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  useStore,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/** Lift labels clear of the stroke so a thick critical path cannot strike through the words. */
const LABEL_OFFSET_Y = -16;
/** When ends share a baseline, an orthogonal hop reads cleaner than a curve. */
const ALIGNED_Y_TOLERANCE = 24;

export type ImpactMapEdgeData = {
  onCriticalPath?: boolean;
  eventCount?: number;
  inferred?: boolean;
  hover?: 'highlighted' | 'dimmed';
};

export type ImpactMapFlowEdge = Edge<ImpactMapEdgeData, 'impact'>;

/**
 * Route edges like an architecture diagram: straight smooth-steps on a shared rank, bezier curves
 * when many sources fan into one target (smoothstep would collapse those into one vertical trunk).
 */
export const ImpactMapEdge = memo(
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
    label,
    data,
  }: EdgeProps<ImpactMapFlowEdge>) => {
    const { euiTheme } = useEuiTheme();
    const aligned = Math.abs(sourceY - targetY) <= ALIGNED_Y_TOLERANCE;

    const curvature = useStore(
      useMemo(
        () => (state: { edges: Array<{ id: string; source: string; target: string }> }) => {
          const intoTarget = state.edges.filter((edge) => edge.target === target);
          const fromSource = state.edges.filter((edge) => edge.source === source);
          const fan = intoTarget.length >= fromSource.length ? intoTarget : fromSource;
          if (fan.length <= 1) {
            return 0.25;
          }
          const ordered = [...fan].sort((a, b) => a.id.localeCompare(b.id));
          const index = Math.max(
            0,
            ordered.findIndex((edge) => edge.id === id)
          );
          return 0.12 + (0.36 * (index + 1)) / (ordered.length + 1);
        },
        [id, source, target]
      )
    );

    const [path, labelX, labelY] = aligned
      ? getSmoothStepPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
          borderRadius: 8,
          offset: 16,
        })
      : getBezierPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
          curvature,
        });
    const highlighted = data?.hover === 'highlighted';
    const dimmed = data?.hover === 'dimmed';

    return (
      <>
        <BaseEdge
          id={id}
          path={path}
          style={style}
          markerEnd={markerEnd}
          interactionWidth={28}
        />
        {label != null && label !== '' && (
          <EdgeLabelRenderer>
            <div
              data-test-subj="impactMapEdgeLabel"
              className="nodrag nopan"
              css={css`
                position: absolute;
                z-index: ${highlighted ? 20 : 10};
                transform: translate(-50%, -50%)
                  translate(${labelX}px, ${labelY + LABEL_OFFSET_Y}px);
                pointer-events: none;
                max-width: 200px;
                padding: ${euiTheme.size.xs} ${euiTheme.size.s};
                border-radius: ${euiTheme.border.radius.medium};
                background: ${euiTheme.colors.backgroundBasePlain};
                border: 1px solid
                  ${highlighted ? euiTheme.colors.primary : euiTheme.colors.borderBaseSubdued};
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
                color: ${euiTheme.colors.textParagraph};
                font-size: 11px;
                font-weight: ${euiTheme.font.weight.semiBold};
                line-height: 1.3;
                text-align: center;
                white-space: normal;
                opacity: ${dimmed ? 0.2 : 1};
              `}
            >
              {label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }
);
ImpactMapEdge.displayName = 'ImpactMapEdge';
