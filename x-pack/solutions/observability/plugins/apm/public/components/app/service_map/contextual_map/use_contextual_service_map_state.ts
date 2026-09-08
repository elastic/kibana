/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  CONTEXTUAL_MAP_DEFAULT_BASE_MAX_HOPS,
  CONTEXTUAL_MAP_DEFAULT_MAX_VISIBLE_NODES,
} from './constants';

export interface ContextualServiceMapState {
  baseMaxHops: number;
  maxVisibleNodes: number;
  expandedNodeIds: Set<string>;
  hasExpandedNodes: boolean;
  onExpand: (nodeId: string) => void;
  onCollapse: (nodeId: string) => void;
  onBaseMaxHopsChange: (value: number) => void;
  onMaxVisibleNodesChange: (value: number) => void;
  resetExpansions: () => void;
}

/**
 * Contextual service map view state: hop depth, visible-node cap, and the set
 * of manually expanded nodes. Expansions reset when either control changes or
 * the focal service changes. Shared by the service overview / transaction
 * details section and the Agent Builder attachment renderer.
 */
export function useContextualServiceMapState({
  serviceName,
}: {
  serviceName?: string;
}): ContextualServiceMapState {
  const [baseMaxHops, setBaseMaxHops] = useState(CONTEXTUAL_MAP_DEFAULT_BASE_MAX_HOPS);
  const [maxVisibleNodes, setMaxVisibleNodes] = useState(CONTEXTUAL_MAP_DEFAULT_MAX_VISIBLE_NODES);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());

  const resetExpansions = useCallback(() => {
    setExpandedNodeIds(new Set());
  }, []);

  const onExpand = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
  }, []);

  const onCollapse = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const onBaseMaxHopsChange = useCallback(
    (value: number) => {
      setBaseMaxHops(value);
      resetExpansions();
    },
    [resetExpansions]
  );

  const onMaxVisibleNodesChange = useCallback(
    (value: number) => {
      setMaxVisibleNodes(value);
      resetExpansions();
    },
    [resetExpansions]
  );

  useEffect(() => {
    resetExpansions();
  }, [serviceName, resetExpansions]);

  return {
    baseMaxHops,
    maxVisibleNodes,
    expandedNodeIds,
    hasExpandedNodes: expandedNodeIds.size > 0,
    onExpand,
    onCollapse,
    onBaseMaxHopsChange,
    onMaxVisibleNodesChange,
    resetExpansions,
  };
}
