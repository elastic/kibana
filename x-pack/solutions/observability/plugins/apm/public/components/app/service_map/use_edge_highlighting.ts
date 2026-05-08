/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { MarkerType } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import {
  DEFAULT_MARKER_SIZE,
  DEFAULT_STROKE_WIDTH,
  HIGHLIGHTED_MARKER_SIZE,
  HIGHLIGHTED_STROKE_WIDTH,
} from './constants';
import type { ServiceMapEdge, EdgeMarker } from '../../../../common/service_map';

interface EdgeMarkers {
  defaultEnd: EdgeMarker;
  highlightedEnd: EdgeMarker;
  defaultStart: EdgeMarker;
  highlightedStart: EdgeMarker;
}

interface ApplyEdgeHighlightingOptions {
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
}

interface UseEdgeHighlightingResult {
  markers: EdgeMarkers;
  applyEdgeHighlighting: (
    edges: ServiceMapEdge[],
    options: ApplyEdgeHighlightingOptions | string | null
  ) => ServiceMapEdge[];
  colors: {
    primary: string;
    default: string;
  };
}

/**
 * Custom hook for managing edge highlighting in the service map.
 * Provides pre-computed markers and a function to apply highlighting
 * based on the selected node.
 *
 * @returns Object containing markers, applyEdgeHighlighting function, and theme colors
 */
export function useEdgeHighlighting(): UseEdgeHighlightingResult {
  const { euiTheme } = useEuiTheme();

  const primaryColor = euiTheme.colors.primary;
  const defaultEdgeColor = euiTheme.colors.mediumShade;

  const defaultZIndex = 0;
  const highlightedZIndex = Number(euiTheme.levels.content);

  const markers = useMemo<EdgeMarkers>(
    () => ({
      defaultEnd: {
        type: MarkerType.ArrowClosed,
        width: DEFAULT_MARKER_SIZE,
        height: DEFAULT_MARKER_SIZE,
        color: defaultEdgeColor,
      },
      highlightedEnd: {
        type: MarkerType.ArrowClosed,
        width: HIGHLIGHTED_MARKER_SIZE,
        height: HIGHLIGHTED_MARKER_SIZE,
        color: primaryColor,
      },
      defaultStart: {
        type: MarkerType.ArrowClosed,
        width: DEFAULT_MARKER_SIZE,
        height: DEFAULT_MARKER_SIZE,
        color: defaultEdgeColor,
      },
      highlightedStart: {
        type: MarkerType.ArrowClosed,
        width: HIGHLIGHTED_MARKER_SIZE,
        height: HIGHLIGHTED_MARKER_SIZE,
        color: primaryColor,
      },
    }),
    [primaryColor, defaultEdgeColor]
  );

  const applyEdgeHighlighting = useCallback(
    (
      edges: ServiceMapEdge[],
      options: ApplyEdgeHighlightingOptions | string | null
    ): ServiceMapEdge[] => {
      // Support legacy API: passing selectedNodeId directly as string
      const { selectedNodeId, selectedEdgeId } =
        typeof options === 'string' || options === null
          ? { selectedNodeId: options, selectedEdgeId: null }
          : options;

      return edges.map((edge) => {
        const isDirectlySelected = selectedEdgeId !== null && edge.id === selectedEdgeId;
        const isConnectedToNode =
          selectedNodeId !== null &&
          (edge.source === selectedNodeId || edge.target === selectedNodeId);
        const isHighlighted = isDirectlySelected || isConnectedToNode;

        const markerEnd = isHighlighted ? markers.highlightedEnd : markers.defaultEnd;
        const markerStart = edge.data?.isBidirectional
          ? isHighlighted
            ? markers.highlightedStart
            : markers.defaultStart
          : undefined;

        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: isHighlighted ? primaryColor : defaultEdgeColor,
            strokeWidth: isHighlighted ? HIGHLIGHTED_STROKE_WIDTH : DEFAULT_STROKE_WIDTH,
          },
          markerEnd,
          markerStart,
          zIndex: isHighlighted ? highlightedZIndex : defaultZIndex,
        };
      });
    },
    [primaryColor, defaultEdgeColor, markers, defaultZIndex, highlightedZIndex]
  );

  return {
    markers,
    applyEdgeHighlighting,
    colors: {
      primary: primaryColor,
      default: defaultEdgeColor,
    },
  };
}
