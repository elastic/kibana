/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGraphPopover } from '@kbn/cloud-security-posture-graph';
import type {
  ExpandButtonClickCallback,
  NodeProps,
} from '@kbn/cloud-security-posture-graph/src/components/types';
import type { PopoverActions } from '@kbn/cloud-security-posture-graph/src/components/graph/use_graph_popover';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GraphNodeExpandPopover } from './graph_node_expand_popover';

interface UseGraphNodeExpandPopoverArgs {
  onExploreRelatedEntitiesClick?: (node: NodeProps) => void;
  onShowActionsByEntityClick?: (node: NodeProps) => void;
  onShowActionsOnEntityClick?: (node: NodeProps) => void;
  onViewEntityDetailsClick?: (node: NodeProps) => void;
}

export const useGraphNodeExpandPopover = (args: UseGraphNodeExpandPopoverArgs = {}) => {
  const {
    onExploreRelatedEntitiesClick,
    onShowActionsByEntityClick,
    onShowActionsOnEntityClick,
    onViewEntityDetailsClick,
  } = args;
  const { id, state, actions } = useGraphPopover('node-expand-popover');
  const { openPopover, closePopover } = actions;

  const selectedNode = useRef<NodeProps | null>(null);
  const unToggleCallbackRef = useRef<(() => void) | null>(null);
  const [pendingOpen, setPendingOpen] = useState<{
    node: NodeProps;
    el: HTMLElement;
    unToggleCallback: () => void;
  } | null>(null);

  const onNodeExpandButtonClick: ExpandButtonClickCallback = useCallback(
    (e, node, unToggleCallback) => {
      if (selectedNode.current?.id === node.id) {
        // If the same node is clicked again, close the popover
        selectedNode.current = null;
        unToggleCallbackRef.current?.();
        unToggleCallbackRef.current = null;
        closePopover();
      } else {
        // Close the current popover if open
        selectedNode.current = null;
        unToggleCallbackRef.current?.();
        unToggleCallbackRef.current = null;

        // Set the pending open state
        setPendingOpen({ node, el: e.currentTarget, unToggleCallback });

        closePopover();
      }
    },
    [closePopover]
  );

  useEffect(() => {
    if (!state.isOpen && pendingOpen) {
      const { node, el, unToggleCallback } = pendingOpen;

      selectedNode.current = node;
      unToggleCallbackRef.current = unToggleCallback;
      openPopover(el);

      setPendingOpen(null);
    }
  }, [state.isOpen, pendingOpen, openPopover]);

  const closePopoverHandler = useCallback(() => {
    selectedNode.current = null;
    unToggleCallbackRef.current?.();
    unToggleCallbackRef.current = null;
    closePopover();
  }, [closePopover]);

  const PopoverComponent = memo(() => (
    <GraphNodeExpandPopover
      isOpen={state.isOpen}
      anchorElement={state.anchorElement}
      closePopover={closePopoverHandler}
      onExploreRelatedEntitiesClick={() => {
        onExploreRelatedEntitiesClick?.(selectedNode.current as NodeProps);
        closePopoverHandler();
      }}
      onShowActionsByEntityClick={() => {
        onShowActionsByEntityClick?.(selectedNode.current as NodeProps);
        closePopoverHandler();
      }}
      onShowActionsOnEntityClick={() => {
        onShowActionsOnEntityClick?.(selectedNode.current as NodeProps);
        closePopoverHandler();
      }}
      onViewEntityDetailsClick={() => {
        onViewEntityDetailsClick?.(selectedNode.current as NodeProps);
        closePopoverHandler();
      }}
    />
  ));

  PopoverComponent.displayName = GraphNodeExpandPopover.displayName;

  const actionsWithClose: PopoverActions = useMemo(
    () => ({
      ...actions,
      closePopover: closePopoverHandler,
    }),
    [actions, closePopoverHandler]
  );

  return useMemo(
    () => ({
      onNodeExpandButtonClick,
      PopoverComponent,
      id,
      actions: actionsWithClose,
      state,
    }),
    [PopoverComponent, actionsWithClose, id, onNodeExpandButtonClick, state]
  );
};
