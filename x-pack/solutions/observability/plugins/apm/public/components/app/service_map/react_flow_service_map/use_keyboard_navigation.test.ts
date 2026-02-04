/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { MarkerType } from '@xyflow/react';
import { useKeyboardNavigation } from './use_keyboard_navigation';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../../common/service_map';
import { DIRECTION_THRESHOLD } from './constants';
import { DEFAULT_EDGE_COLOR } from '../../../../../common/service_map/constants';

function createNode(id: string, x: number, y: number, label?: string): ServiceMapNode {
  return {
    id,
    position: { x, y },
    data: {
      id,
      label: label || id,
    },
    type: 'service',
  } as ServiceMapNode;
}

function createEdge(source: string, target: string): ServiceMapEdge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    type: 'default',
    style: { stroke: DEFAULT_EDGE_COLOR, strokeWidth: 1 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 12,
      height: 12,
      color: DEFAULT_EDGE_COLOR,
    },
    data: {
      isBidirectional: false,
      sourceData: { label: source, id: source },
      targetData: { label: target, id: target },
    },
  };
}

const defaultProps = {
  nodes: [] as ServiceMapNode[],
  edges: [] as ServiceMapEdge[],
  selectedNodeId: null,
  selectedNodeForPopover: null,
  selectedEdgeForPopover: null,
  onNodeSelect: jest.fn(),
  onEdgeSelect: jest.fn(),
  onPopoverClose: jest.fn(),
};

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findNodeInDirection', () => {
    describe('with no nodes', () => {
      it('returns null when nodes array is empty', () => {
        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes: [],
          })
        );

        expect(result.current.findNodeInDirection('nonexistent', 'ArrowRight')).toBeNull();
      });
    });

    describe('with single node', () => {
      it('returns null when only one node exists', () => {
        const nodes = [createNode('a', 100, 100)];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        expect(result.current.findNodeInDirection('a', 'ArrowRight')).toBeNull();
        expect(result.current.findNodeInDirection('a', 'ArrowLeft')).toBeNull();
        expect(result.current.findNodeInDirection('a', 'ArrowUp')).toBeNull();
        expect(result.current.findNodeInDirection('a', 'ArrowDown')).toBeNull();
      });

      it('returns null when current node does not exist', () => {
        const nodes = [createNode('a', 100, 100)];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        expect(result.current.findNodeInDirection('nonexistent', 'ArrowRight')).toBeNull();
      });
    });

    describe('horizontal navigation (ArrowRight/ArrowLeft)', () => {
      it('finds node to the right', () => {
        const nodes = [
          createNode('a', 0, 100),
          createNode('b', 200, 100), // To the right of 'a'
        ];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        const nextNode = result.current.findNodeInDirection('a', 'ArrowRight');
        expect(nextNode?.id).toBe('b');
      });

      it('finds node to the left', () => {
        const nodes = [
          createNode('a', 200, 100),
          createNode('b', 0, 100), // To the left of 'a'
        ];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        const nextNode = result.current.findNodeInDirection('a', 'ArrowLeft');
        expect(nextNode?.id).toBe('b');
      });

      it('does not find node when horizontal distance is below threshold', () => {
        const nodes = [
          createNode('a', 100, 100),
          createNode('b', 100 + DIRECTION_THRESHOLD - 1, 100), // Just below threshold
        ];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        expect(result.current.findNodeInDirection('a', 'ArrowRight')).toBeNull();
      });

      it('finds node when horizontal distance is at threshold', () => {
        const nodes = [
          createNode('a', 100, 100),
          createNode('b', 100 + DIRECTION_THRESHOLD + 1, 100), // Just above threshold
        ];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        const nextNode = result.current.findNodeInDirection('a', 'ArrowRight');
        expect(nextNode?.id).toBe('b');
      });

      it('prefers horizontal movement over diagonal when dx > dy', () => {
        const nodes = [
          createNode('a', 0, 100),
          createNode('b', 200, 120), // Slightly down and to the right
        ];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        // Should find 'b' when going right because dx (200) > dy (20)
        const nextNode = result.current.findNodeInDirection('a', 'ArrowRight');
        expect(nextNode?.id).toBe('b');
      });

      it('does not find node horizontally when dy >= dx', () => {
        const nodes = [
          createNode('a', 0, 0),
          createNode('b', 100, 150), // More vertical than horizontal
        ];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        expect(result.current.findNodeInDirection('a', 'ArrowRight')).toBeNull();
      });
    });

    describe('vertical navigation (ArrowUp/ArrowDown)', () => {
      it('finds node below', () => {
        const nodes = [
          createNode('a', 100, 0),
          createNode('b', 100, 200), // Below 'a'
        ];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        const nextNode = result.current.findNodeInDirection('a', 'ArrowDown');
        expect(nextNode?.id).toBe('b');
      });

      it('finds node above', () => {
        const nodes = [
          createNode('a', 100, 200),
          createNode('b', 100, 0), // Above 'a'
        ];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        const nextNode = result.current.findNodeInDirection('a', 'ArrowUp');
        expect(nextNode?.id).toBe('b');
      });

      it('does not find node when vertical distance is below threshold', () => {
        const nodes = [
          createNode('a', 100, 100),
          createNode('b', 100, 100 + DIRECTION_THRESHOLD - 1), // Just below threshold
        ];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        expect(result.current.findNodeInDirection('a', 'ArrowDown')).toBeNull();
      });

      it('prefers vertical movement over diagonal when dy > dx', () => {
        const nodes = [
          createNode('a', 100, 0),
          createNode('b', 120, 200), // Slightly right and below
        ];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        // Should find 'b' when going down because dy (200) > dx (20)
        const nextNode = result.current.findNodeInDirection('a', 'ArrowDown');
        expect(nextNode?.id).toBe('b');
      });
    });

    describe('distance-based selection', () => {
      it('selects the closest node in the direction', () => {
        const nodes = [
          createNode('a', 0, 100),
          createNode('b', 150, 100), // Closer
          createNode('c', 300, 100), // Further
        ];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        const nextNode = result.current.findNodeInDirection('a', 'ArrowRight');
        expect(nextNode?.id).toBe('b');
      });

      it('navigates through multiple nodes correctly', () => {
        const nodes = [
          createNode('a', 0, 100),
          createNode('b', 200, 100),
          createNode('c', 400, 100),
        ];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        // From 'a', go right to 'b'
        let nextNode = result.current.findNodeInDirection('a', 'ArrowRight');
        expect(nextNode?.id).toBe('b');

        // From 'b', go right to 'c'
        nextNode = result.current.findNodeInDirection('b', 'ArrowRight');
        expect(nextNode?.id).toBe('c');

        // From 'c', go left to 'b'
        nextNode = result.current.findNodeInDirection('c', 'ArrowLeft');
        expect(nextNode?.id).toBe('b');
      });
    });

    describe('complex graph navigation', () => {
      it('navigates in a grid-like layout', () => {
        //  A --- B
        //  |     |
        //  C --- D
        const nodes = [
          createNode('a', 0, 0),
          createNode('b', 200, 0),
          createNode('c', 0, 200),
          createNode('d', 200, 200),
        ];

        const { result } = renderHook(() =>
          useKeyboardNavigation({
            ...defaultProps,
            nodes,
          })
        );

        // From A
        expect(result.current.findNodeInDirection('a', 'ArrowRight')?.id).toBe('b');
        expect(result.current.findNodeInDirection('a', 'ArrowDown')?.id).toBe('c');
        expect(result.current.findNodeInDirection('a', 'ArrowLeft')).toBeNull();
        expect(result.current.findNodeInDirection('a', 'ArrowUp')).toBeNull();

        // From D
        expect(result.current.findNodeInDirection('d', 'ArrowLeft')?.id).toBe('c');
        expect(result.current.findNodeInDirection('d', 'ArrowUp')?.id).toBe('b');
        expect(result.current.findNodeInDirection('d', 'ArrowRight')).toBeNull();
        expect(result.current.findNodeInDirection('d', 'ArrowDown')).toBeNull();
      });
    });
  });

  describe('screen reader announcements', () => {
    it('initializes with empty announcement', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultProps));

      expect(result.current.screenReaderAnnouncement).toBe('');
    });
  });

  describe('keyboard event handling', () => {
    it('calls onPopoverClose when Escape is pressed with open node popover', () => {
      const onPopoverClose = jest.fn();
      const selectedNode = createNode('a', 100, 100);

      renderHook(() =>
        useKeyboardNavigation({
          ...defaultProps,
          selectedNodeForPopover: selectedNode,
          onPopoverClose,
        })
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(onPopoverClose).toHaveBeenCalledTimes(1);
    });

    it('calls onPopoverClose when Escape is pressed with open edge popover', () => {
      const onPopoverClose = jest.fn();
      const selectedEdge = createEdge('a', 'b');

      renderHook(() =>
        useKeyboardNavigation({
          ...defaultProps,
          selectedEdgeForPopover: selectedEdge,
          onPopoverClose,
        })
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(onPopoverClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onPopoverClose when Escape is pressed without open popover', () => {
      const onPopoverClose = jest.fn();

      renderHook(() =>
        useKeyboardNavigation({
          ...defaultProps,
          onPopoverClose,
        })
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(onPopoverClose).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useKeyboardNavigation(defaultProps));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });
});
