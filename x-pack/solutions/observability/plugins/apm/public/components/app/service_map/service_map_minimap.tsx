/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { Panel, useReactFlow, useStore } from '@xyflow/react';
import {
  useEuiTheme,
  EuiIcon,
  EuiToolTip,
  type EuiThemeComputed,
  type IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { getSeverityColor } from '../../../../common/anomaly_detection';
import type { ServiceMapNode } from '../../../../common/service_map';
import { isServiceNodeData, isServiceNode } from '../../../../common/service_map';
import { MINIMAP_WIDTH, MINIMAP_HEIGHT, MINIMAP_CONTEXT_VIEWPORTS } from './constants';
import { getMinimapView, minimapPointToWorld, type MinimapView } from './get_minimap_view';

/**
 * Resolves the color used for a node in the minimap so it matches the node's appearance on the map:
 * a service with an ML anomaly score uses its severity color; every other node uses the default gray
 * (`mediumShade`), matching the node's default border color.
 */
export function getMinimapNodeColor(
  node: ServiceMapNode,
  euiTheme: Pick<EuiThemeComputed['colors'], 'mediumShade'>
): string {
  if (isServiceNodeData(node.data)) {
    const { anomalyScore } = node.data.serviceAnomalyStats ?? {};
    if (anomalyScore !== undefined) {
      return getSeverityColor(anomalyScore);
    }
  }
  return euiTheme.mediumShade;
}

interface ServiceMapMinimapProps {
  /** The nodes currently rendered on the map (laid out + filtered). */
  nodes: ServiceMapNode[];
}

/** Static placement of the overflow indicators along each edge of the minimap. */
const OVERFLOW_ARROWS: Array<{
  key: keyof MinimapView['overflow'];
  iconType: 'chevronSingleLeft' | 'chevronSingleRight' | 'chevronSingleUp' | 'chevronSingleDown';
  position: ReturnType<typeof css>;
}> = [
  {
    key: 'left',
    iconType: 'chevronSingleLeft',
    position: css`
      left: 0;
      top: 50%;
      transform: translateY(-50%);
    `,
  },
  {
    key: 'right',
    iconType: 'chevronSingleRight',
    position: css`
      right: 0;
      top: 50%;
      transform: translateY(-50%);
    `,
  },
  {
    key: 'top',
    iconType: 'chevronSingleUp',
    position: css`
      top: 0;
      left: 50%;
      transform: translateX(-50%);
    `,
  },
  {
    key: 'bottom',
    iconType: 'chevronSingleDown',
    position: css`
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
    `,
  },
];

const svgStyles = css`
  cursor: pointer;
  display: block;
  touch-action: none;
`;

/**
 * Adaptive minimap for the service map.
 *
 * Unlike React Flow's built-in `<MiniMap>` (which always scales to the bounding box of every node and
 * collapses sprawling graphs into an unreadable thin line), this shows a window of context around the
 * current viewport for large graphs — see {@link getMinimapView} — and the whole graph for small ones.
 * Clicking or dragging recenters the main view on the corresponding location.
 */
export function ServiceMapMinimap({ nodes }: ServiceMapMinimapProps) {
  const { euiTheme } = useEuiTheme();
  const { setCenter } = useReactFlow<ServiceMapNode>();
  const transform = useStore((s) => s.transform);
  const paneWidth = useStore((s) => s.width);
  const paneHeight = useStore((s) => s.height);
  const zoom = transform[2];

  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingRef = useRef(false);

  const view = useMemo(
    () =>
      getMinimapView({
        nodes,
        transform,
        paneWidth,
        paneHeight,
        width: MINIMAP_WIDTH,
        height: MINIMAP_HEIGHT,
        contextViewports: MINIMAP_CONTEXT_VIEWPORTS,
      }),
    [nodes, transform, paneWidth, paneHeight]
  );

  const navigateToEvent = useCallback(
    (event: React.PointerEvent<SVGSVGElement>, currentView: MinimapView) => {
      const svg = svgRef.current;
      if (!svg) {
        return;
      }
      const rect = svg.getBoundingClientRect();
      const world = minimapPointToWorld(
        currentView,
        event.clientX - rect.left,
        event.clientY - rect.top
      );
      setCenter(world.x, world.y, { zoom, duration: 0 });
    },
    [setCenter, zoom]
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!view) {
        return;
      }
      isDraggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      navigateToEvent(event, view);
    },
    [view, navigateToEvent]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!isDraggingRef.current || !view) {
        return;
      }
      navigateToEvent(event, view);
    },
    [view, navigateToEvent]
  );

  const onPointerUp = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    isDraggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const containerStyles = useMemo(
    () => css`
      background-color: ${euiTheme.colors.backgroundBasePlain};
      border-radius: ${euiTheme.border.radius.medium};
      border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
      padding: ${euiTheme.size.xs};
      line-height: 0;
    `,
    [euiTheme]
  );

  const ariaLabel = i18n.translate('xpack.apm.serviceMap.minimap.ariaLabel', {
    defaultMessage: 'Service map minimap. Use to navigate and zoom the map.',
  });

  const cameraOverflowTooltip = i18n.translate(
    'xpack.apm.serviceMap.minimap.cameraOverflowTooltip',
    {
      defaultMessage: 'The current map view extends beyond the minimap in this direction.',
    }
  );

  const renderEdgeIndicators = (
    flags: MinimapView['overflow'],
    color: string,
    testSubjPrefix: string,
    options?: { iconOverride?: IconType; tooltipContent?: string }
  ): React.ReactElement[] =>
    OVERFLOW_ARROWS.filter(({ key }) => flags[key]).map(({ key, iconType, position }) => {
      const icon = (
        <span
          data-test-subj={`${testSubjPrefix}-${key}`}
          css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${color};
            background-color: ${euiTheme.colors.backgroundBasePlain};
            border-radius: ${euiTheme.border.radius.small};
            opacity: 0.85;
          `}
        >
          <EuiIcon type={options?.iconOverride ?? iconType} size="s" aria-hidden={true} />
        </span>
      );

      return (
        <div
          key={`${testSubjPrefix}-${key}`}
          css={css`
            position: absolute;
            ${position};
            /* Only the tooltip indicator needs to capture hover; arrows stay click-through. */
            pointer-events: ${options?.tooltipContent ? 'auto' : 'none'};
          `}
        >
          {options?.tooltipContent ? (
            <EuiToolTip content={options.tooltipContent}>{icon}</EuiToolTip>
          ) : (
            icon
          )}
        </div>
      );
    });

  return (
    <Panel position="bottom-right" data-test-subj="serviceMapMinimap" css={containerStyles}>
      {view && (
        <div
          data-test-subj="serviceMapMinimapContainer"
          css={css`
            position: relative;
            width: ${view.width}px;
            height: ${view.height}px;
          `}
        >
          <svg
            ref={svgRef}
            width={view.width}
            height={view.height}
            viewBox={`0 0 ${view.width} ${view.height}`}
            role="img"
            aria-label={ariaLabel}
            data-test-subj="serviceMapMinimapSvg"
            css={svgStyles}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {view.nodes.map((n) => {
              const fill = getMinimapNodeColor(n.node, euiTheme.colors);
              // Match the shapes used on the map itself: services are rectangles, while
              // dependency/grouped nodes (databases, external, messaging) are diamonds.
              if (isServiceNode(n.node)) {
                return (
                  <rect
                    key={n.id}
                    data-test-subj="serviceMapMinimapNode"
                    x={n.x}
                    y={n.y}
                    width={n.width}
                    height={n.height}
                    rx={1}
                    fill={fill}
                  />
                );
              }

              const centerX = n.x + n.width / 2;
              const centerY = n.y + n.height / 2;
              const points = `${centerX},${n.y} ${n.x + n.width},${centerY} ${centerX},${
                n.y + n.height
              } ${n.x},${centerY}`;

              return (
                <polygon
                  key={n.id}
                  data-test-subj="serviceMapMinimapNode"
                  points={points}
                  fill={fill}
                />
              );
            })}
            <rect
              data-test-subj="serviceMapMinimapViewport"
              x={view.viewport.x}
              y={view.viewport.y}
              width={view.viewport.width}
              height={view.viewport.height}
              fill={`${euiTheme.colors.primary}1A`}
              stroke={euiTheme.colors.primary}
              strokeWidth={1}
              rx={2}
              pointerEvents="none"
            />
          </svg>
          {renderEdgeIndicators(
            view.overflow,
            euiTheme.colors.textParagraph,
            'serviceMapMinimapOverflow'
          )}
          {renderEdgeIndicators(
            view.cameraOverflow,
            euiTheme.colors.primary,
            'serviceMapMinimapCameraOverflow',
            { iconOverride: 'crosshair', tooltipContent: cameraOverflowTooltip }
          )}
        </div>
      )}
    </Panel>
  );
}
