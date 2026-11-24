/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  isServiceGroupBoxNode,
  isServiceGroupNode,
  type ServiceMapNode,
  type ServiceMapEdge,
} from '../../../../common/service_map';
import { DIRECTION_THRESHOLD } from './constants';

type ArrowDirection = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

interface UseKeyboardNavigationOptions {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  selectedNodeId: string | null;
  selectedNodeForPopover: ServiceMapNode | null;
  selectedEdgeForFlyout: ServiceMapEdge | null;
  onNodeSelect: (node: ServiceMapNode | null) => void;
  onEdgeSelect: (edge: ServiceMapEdge | null) => void;
  onPopoverClose: () => void;
  /** When false, disables keyboard selection to match mouse click + drag being disabled. */
  isInteractive?: boolean;
}

interface UseKeyboardNavigationResult {
  screenReaderAnnouncement: string;
  findNodeInDirection: (currentNodeId: string, direction: ArrowDirection) => ServiceMapNode | null;
}

/** The box of the open group a node is the box of, or a member of. */
const getOpenGroupBox = (
  node: ServiceMapNode,
  nodes: ServiceMapNode[]
): ServiceMapNode | undefined =>
  isServiceGroupBoxNode(node)
    ? node
    : nodes.find((candidate) => candidate.id === node.parentId && isServiceGroupBoxNode(candidate));

const getGroupClosedAnnouncement = (box: ServiceMapNode): string =>
  i18n.translate('xpack.apm.serviceMap.groupClosed', {
    defaultMessage: 'Closed group {groupLabel}.',
    values: { groupLabel: box.data.label || box.id },
  });

/**
 * Hook that provides keyboard navigation for the service map.
 *
 * Supports:
 * - Arrow keys: Spatial navigation between nodes
 * - Enter/Space: Open popover for focused node; open a group, or close an open one
 * - Escape: Close popover; close the open group the focus is in
 *
 * Also manages screen reader announcements for navigation events.
 */
export function useKeyboardNavigation({
  nodes,
  edges,
  selectedNodeId,
  selectedNodeForPopover,
  selectedEdgeForFlyout,
  onNodeSelect,
  onEdgeSelect,
  onPopoverClose,
  isInteractive = true,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationResult {
  const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState<string>('');

  /**
   * Find the closest node in a given direction from the current node.
   * Uses spatial positioning and distance calculation.
   */
  const findNodeInDirection = useCallback(
    (currentNodeId: string, direction: ArrowDirection): ServiceMapNode | null => {
      const currentNode = nodes?.find((n) => n.id === currentNodeId);
      if (!currentNode) return null;

      const current = currentNode.position;
      const candidates: Array<{ node: ServiceMapNode; distance: number }> = [];

      nodes.forEach((node) => {
        if (node.id === currentNodeId) return;

        const pos = node.position;
        const dx = pos.x - current.x;
        const dy = pos.y - current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const isInDirection =
          (direction === 'ArrowRight' && dx > DIRECTION_THRESHOLD && Math.abs(dy) < Math.abs(dx)) ||
          (direction === 'ArrowLeft' && dx < -DIRECTION_THRESHOLD && Math.abs(dy) < Math.abs(dx)) ||
          (direction === 'ArrowDown' && dy > DIRECTION_THRESHOLD && Math.abs(dx) < Math.abs(dy)) ||
          (direction === 'ArrowUp' && dy < -DIRECTION_THRESHOLD && Math.abs(dx) < Math.abs(dy));

        if (isInDirection) {
          candidates.push({ node, distance });
        }
      });

      candidates.sort((a, b) => a.distance - b.distance);
      return candidates[0]?.node || null;
    },
    [nodes]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isInteractive) {
        return;
      }
      // The flyouts close themselves on Escape (EUI), also when a child flyout is focused.
      if (event.key === 'Escape' && selectedNodeForPopover) {
        event.preventDefault();
        onPopoverClose();
        setScreenReaderAnnouncement(
          i18n.translate('xpack.apm.serviceMap.popoverClosed', {
            defaultMessage: 'Popover closed',
          })
        );
        return;
      }
      // Escape on the box of an open group, or on one of its members, closes the group. Not while a
      // node is selected: then Escape is for what is open for it (a flyout closes itself on Escape).
      if (event.key === 'Escape' && !selectedNodeId) {
        const focusedNodeId = document.activeElement?.closest('[data-id]')?.getAttribute('data-id');
        const focusedNode = nodes?.find((n) => n.id === focusedNodeId);
        const box = focusedNode && getOpenGroupBox(focusedNode, nodes);
        if (box) {
          event.preventDefault();
          onNodeSelect(box);
          setScreenReaderAnnouncement(getGroupClosedAnnouncement(box));
          return;
        }
      }
      if (event.key === 'Enter' || event.key === ' ') {
        const activeElement = document.activeElement;
        const edgeElement = activeElement?.closest('.react-flow__edge');
        if (edgeElement) {
          const edgeElementId = edgeElement.getAttribute('data-id');
          if (!edgeElementId) return;
          const focusedEdge = edges?.find((e) => e.id === edgeElementId);
          if (!focusedEdge) return;
          event.preventDefault();

          if (selectedEdgeForFlyout?.id === edgeElementId) {
            onPopoverClose();
          } else {
            onEdgeSelect(focusedEdge);
            const sourceLabel = String(focusedEdge.data?.sourceData?.label || focusedEdge.source);
            const targetLabel = String(focusedEdge.data?.targetData?.label || focusedEdge.target);
            setScreenReaderAnnouncement(
              i18n.translate('xpack.apm.serviceMap.edgeSelected', {
                defaultMessage:
                  'Selected connection from {source} to {target}. Press Escape to close.',
                values: { source: sourceLabel, target: targetLabel },
              })
            );
          }
          return;
        }
        const nodeElement = activeElement?.closest('[data-id]');
        if (nodeElement && !edgeElement) {
          const nodeId = nodeElement.getAttribute('data-id');
          const focusedNode = nodes?.find((n) => n.id === nodeId);
          if (!focusedNode) return;

          event.preventDefault();

          if (selectedNodeId === nodeId) {
            onPopoverClose();
          } else if (isServiceGroupNode(focusedNode) || isServiceGroupBoxNode(focusedNode)) {
            // Groups open and close instead of being selected.
            onNodeSelect(focusedNode);
            setScreenReaderAnnouncement(
              isServiceGroupNode(focusedNode)
                ? i18n.translate('xpack.apm.serviceMap.groupOpened', {
                    defaultMessage:
                      'Opened group {groupLabel}. Press Enter or Escape on it to close.',
                    values: { groupLabel: focusedNode.data.label || nodeId },
                  })
                : getGroupClosedAnnouncement(focusedNode)
            );
          } else {
            onNodeSelect(focusedNode);
            setScreenReaderAnnouncement(
              i18n.translate('xpack.apm.serviceMap.nodeSelected', {
                defaultMessage: 'Selected {nodeLabel}. Press Escape to close.',
                values: { nodeLabel: focusedNode.data.label || nodeId },
              })
            );
          }
        }
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        const activeElement = document.activeElement;
        const currentNodeElement = activeElement?.closest('[data-id]');
        if (currentNodeElement && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          const currentNodeId = currentNodeElement.getAttribute('data-id');
          if (!currentNodeId) return null;

          const nextNode = findNodeInDirection(currentNodeId, event.key as ArrowDirection);
          if (!nextNode) return null;

          event.preventDefault();

          const nextElement = document.querySelector(`[data-id="${nextNode.id}"]`);
          if (nextElement instanceof HTMLElement) {
            nextElement.focus();
            setScreenReaderAnnouncement(
              i18n.translate('xpack.apm.serviceMap.nodeFocused', {
                defaultMessage: 'Focused on {nodeLabel}',
                values: { nodeLabel: nextNode.data.label || nextNode.id },
              })
            );
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    nodes,
    edges,
    selectedNodeId,
    selectedNodeForPopover,
    selectedEdgeForFlyout,
    onNodeSelect,
    onEdgeSelect,
    onPopoverClose,
    findNodeInDirection,
    isInteractive,
  ]);

  return {
    screenReaderAnnouncement,
    findNodeInDirection,
  };
}
