/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { MarkerType } from '@xyflow/react';
import { useEdgeHighlighting } from './use_edge_highlighting';
import type { ServiceMapEdge } from '../../../../common/service_map';
import {
  DEFAULT_MARKER_SIZE,
  HIGHLIGHTED_MARKER_SIZE,
  DEFAULT_STROKE_WIDTH,
  HIGHLIGHTED_STROKE_WIDTH,
  MOCK_PRIMARY_COLOR,
  MOCK_DEFAULT_COLOR,
} from './constants';
import { SPAN_DESTINATION_SERVICE_RESOURCE, SPAN_TYPE, SPAN_SUBTYPE } from '@kbn/apm-types';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({
      euiTheme: {
        colors: {
          primary: MOCK_PRIMARY_COLOR,
          mediumShade: MOCK_DEFAULT_COLOR,
        },
        levels: {
          content: 1000,
        },
      },
    }),
  };
});

function createEdge(
  source: string,
  target: string,
  isBidirectional: boolean = false
): ServiceMapEdge {
  return {
    id: `${source}~>${target}`,
    source,
    target,
    type: 'default',
    style: { stroke: MOCK_DEFAULT_COLOR, strokeWidth: 1 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 12,
      height: 12,
      color: MOCK_DEFAULT_COLOR,
    },
    data: {
      isBidirectional,
      sourceData: {
        id: source,
        label: source,
        [SPAN_DESTINATION_SERVICE_RESOURCE]: source,
        [SPAN_TYPE]: 'external',
        [SPAN_SUBTYPE]: 'http',
      },
      targetData: {
        id: target,
        label: target,
        [SPAN_DESTINATION_SERVICE_RESOURCE]: target,
        [SPAN_TYPE]: 'external',
        [SPAN_SUBTYPE]: 'http',
      },
    },
  };
}

describe('useEdgeHighlighting', () => {
  describe('markers', () => {
    it('returns pre-computed default and highlighted markers', () => {
      const { result } = renderHook(() => useEdgeHighlighting());

      expect(result.current.markers).toEqual({
        defaultEnd: {
          type: MarkerType.ArrowClosed,
          width: DEFAULT_MARKER_SIZE,
          height: DEFAULT_MARKER_SIZE,
          color: MOCK_DEFAULT_COLOR,
        },
        highlightedEnd: {
          type: MarkerType.ArrowClosed,
          width: HIGHLIGHTED_MARKER_SIZE,
          height: HIGHLIGHTED_MARKER_SIZE,
          color: MOCK_PRIMARY_COLOR,
        },
        defaultStart: {
          type: MarkerType.ArrowClosed,
          width: DEFAULT_MARKER_SIZE,
          height: DEFAULT_MARKER_SIZE,
          color: MOCK_DEFAULT_COLOR,
        },
        highlightedStart: {
          type: MarkerType.ArrowClosed,
          width: HIGHLIGHTED_MARKER_SIZE,
          height: HIGHLIGHTED_MARKER_SIZE,
          color: MOCK_PRIMARY_COLOR,
        },
      });
    });
  });

  describe('colors', () => {
    it('returns theme colors for primary and default', () => {
      const { result } = renderHook(() => useEdgeHighlighting());

      expect(result.current.colors).toEqual({
        primary: MOCK_PRIMARY_COLOR,
        default: MOCK_DEFAULT_COLOR,
      });
    });
  });

  describe('applyEdgeHighlighting', () => {
    describe('with no selection', () => {
      it('returns edges with default styling when selectedNodeId is null', () => {
        const { result } = renderHook(() => useEdgeHighlighting());
        const edges = [createEdge('a', 'b'), createEdge('b', 'c')];

        const highlighted = result.current.applyEdgeHighlighting(edges, null);

        expect(highlighted).toHaveLength(2);
        highlighted.forEach((edge) => {
          expect(edge.style?.stroke).toBe(MOCK_DEFAULT_COLOR);
          expect(edge.style?.strokeWidth).toBe(DEFAULT_STROKE_WIDTH);
          expect(edge.markerEnd).toEqual(result.current.markers.defaultEnd);
          expect(edge.zIndex).toBe(0);
        });
      });

      it('returns edges with default styling when options object has null values', () => {
        const { result } = renderHook(() => useEdgeHighlighting());
        const edges = [createEdge('a', 'b')];

        const highlighted = result.current.applyEdgeHighlighting(edges, {
          selectedNodeId: null,
          selectedEdgeId: null,
        });

        expect(highlighted[0].style?.stroke).toBe(MOCK_DEFAULT_COLOR);
        expect(highlighted[0].style?.strokeWidth).toBe(DEFAULT_STROKE_WIDTH);
      });
    });

    describe('with node selection', () => {
      it('highlights edges connected to selected node as source', () => {
        const { result } = renderHook(() => useEdgeHighlighting());
        const edges = [createEdge('a', 'b'), createEdge('c', 'd')];

        const highlighted = result.current.applyEdgeHighlighting(edges, 'a');

        const edgeAB = highlighted.find((e) => e.id === 'a~>b');
        expect(edgeAB?.style?.stroke).toBe(MOCK_PRIMARY_COLOR);
        expect(edgeAB?.style?.strokeWidth).toBe(HIGHLIGHTED_STROKE_WIDTH);
        expect(edgeAB?.markerEnd).toEqual(result.current.markers.highlightedEnd);
        expect(edgeAB?.zIndex).toBe(1000);

        const edgeCD = highlighted.find((e) => e.id === 'c~>d');
        expect(edgeCD?.style?.stroke).toBe(MOCK_DEFAULT_COLOR);
        expect(edgeCD?.style?.strokeWidth).toBe(DEFAULT_STROKE_WIDTH);
      });

      it('highlights edges connected to selected node as target', () => {
        const { result } = renderHook(() => useEdgeHighlighting());
        const edges = [createEdge('a', 'b'), createEdge('c', 'd')];

        const highlighted = result.current.applyEdgeHighlighting(edges, 'b');

        const edgeAB = highlighted.find((e) => e.id === 'a~>b');
        expect(edgeAB?.style?.stroke).toBe(MOCK_PRIMARY_COLOR);
        expect(edgeAB?.style?.strokeWidth).toBe(HIGHLIGHTED_STROKE_WIDTH);
      });

      it('supports legacy API with selectedNodeId as string', () => {
        const { result } = renderHook(() => useEdgeHighlighting());
        const edges = [createEdge('a', 'b')];

        const highlighted = result.current.applyEdgeHighlighting(edges, 'a');

        expect(highlighted[0].style?.stroke).toBe(MOCK_PRIMARY_COLOR);
      });

      it('supports options object with selectedNodeId', () => {
        const { result } = renderHook(() => useEdgeHighlighting());
        const edges = [createEdge('a', 'b')];

        const highlighted = result.current.applyEdgeHighlighting(edges, {
          selectedNodeId: 'a',
          selectedEdgeId: null,
        });

        expect(highlighted[0].style?.stroke).toBe(MOCK_PRIMARY_COLOR);
      });
    });

    describe('with edge selection', () => {
      it('highlights the directly selected edge', () => {
        const { result } = renderHook(() => useEdgeHighlighting());
        const edges = [createEdge('a', 'b'), createEdge('c', 'd')];

        const highlighted = result.current.applyEdgeHighlighting(edges, {
          selectedNodeId: null,
          selectedEdgeId: 'a~>b',
        });

        const edgeAB = highlighted.find((e) => e.id === 'a~>b');
        expect(edgeAB?.style?.stroke).toBe(MOCK_PRIMARY_COLOR);
        expect(edgeAB?.style?.strokeWidth).toBe(HIGHLIGHTED_STROKE_WIDTH);
        expect(edgeAB?.zIndex).toBe(1000);

        const edgeCD = highlighted.find((e) => e.id === 'c~>d');
        expect(edgeCD?.style?.stroke).toBe(MOCK_DEFAULT_COLOR);
      });
    });

    describe('with bidirectional edges', () => {
      it('adds highlighted markerStart for bidirectional edges when highlighted', () => {
        const { result } = renderHook(() => useEdgeHighlighting());
        const edges = [createEdge('a', 'b', true)];

        const highlighted = result.current.applyEdgeHighlighting(edges, 'a');

        expect(highlighted[0].markerStart).toEqual(result.current.markers.highlightedStart);
        expect(highlighted[0].markerEnd).toEqual(result.current.markers.highlightedEnd);
      });

      it('adds default markerStart for bidirectional edges when not highlighted', () => {
        const { result } = renderHook(() => useEdgeHighlighting());
        const edges = [createEdge('a', 'b', true)];

        const highlighted = result.current.applyEdgeHighlighting(edges, null);

        expect(highlighted[0].markerStart).toEqual(result.current.markers.defaultStart);
        expect(highlighted[0].markerEnd).toEqual(result.current.markers.defaultEnd);
      });

      it('does not add markerStart for unidirectional edges', () => {
        const { result } = renderHook(() => useEdgeHighlighting());
        const edges = [createEdge('a', 'b', false)];

        const highlighted = result.current.applyEdgeHighlighting(edges, 'a');

        expect(highlighted[0].markerStart).toBeUndefined();
      });
    });

    describe('edge preservation', () => {
      it('preserves original edge properties', () => {
        const { result } = renderHook(() => useEdgeHighlighting());
        const edges: ServiceMapEdge[] = [
          {
            ...createEdge('a', 'b'),
            type: 'default',
            data: {
              isBidirectional: false,
              sourceData: {
                id: 'a',
                label: 'A',
                [SPAN_DESTINATION_SERVICE_RESOURCE]: 'a',
                [SPAN_TYPE]: 'external',
                [SPAN_SUBTYPE]: 'http',
              },
              targetData: {
                id: 'b',
                label: 'B',
                [SPAN_DESTINATION_SERVICE_RESOURCE]: 'b',
                [SPAN_TYPE]: 'external',
                [SPAN_SUBTYPE]: 'http',
              },
              customField: 'customValue',
            },
          },
        ];

        const highlighted = result.current.applyEdgeHighlighting(edges, null);

        expect(highlighted[0]).toEqual(
          expect.objectContaining({
            id: 'a~>b',
            source: 'a',
            target: 'b',
            type: 'default',
            data: expect.objectContaining({
              customField: 'customValue',
            }),
          })
        );
      });
    });

    describe('multiple connected edges', () => {
      it('highlights all edges connected to a node', () => {
        const { result } = renderHook(() => useEdgeHighlighting());
        const edges = [
          createEdge('a', 'b'),
          createEdge('a', 'c'),
          createEdge('d', 'a'),
          createEdge('e', 'f'),
        ];

        const highlighted = result.current.applyEdgeHighlighting(edges, 'a');

        const connectedEdges = highlighted.filter(
          (e) => e.id === 'a~>b' || e.id === 'a~>c' || e.id === 'd~>a'
        );
        expect(connectedEdges).toHaveLength(3);
        connectedEdges.forEach((edge) => {
          expect(edge.style?.stroke).toBe(MOCK_PRIMARY_COLOR);
          expect(edge.zIndex).toBe(1000);
        });

        const unconnectedEdge = highlighted.find((e) => e.id === 'e~>f');
        expect(unconnectedEdge?.style?.stroke).toBe(MOCK_DEFAULT_COLOR);
        expect(unconnectedEdge?.zIndex).toBe(0);
      });
    });
  });
});
