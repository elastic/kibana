/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import type { ServiceMapNode } from '../../../../common/service_map';

interface UseRovingTabIndexResult {
  focusedNodeId: string | null;
  moveFocus: (nodeId: string) => void;
}

/**
 * Manages roving tabindex for ReactFlow node wrappers.
 *
 * ReactFlow doesn't support per-node tabIndex when nodesFocusable={false},
 * so this hook manages tabIndex directly on wrapper elements via data-id selectors.
 *
 * DOM mutations happen in two paths:
 * - moveFocus(): synchronous swap for keyboard navigation (tabIndex must be
 *   set before .focus() so the element is focusable at call time)
 * - useEffect: bulk apply on mount and when nodes change (handles initialization,
 *   node additions/removals, and stale-focus recovery)
 */
export function useRovingTabIndex(nodes: ServiceMapNode[]): UseRovingTabIndexResult {
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const focusedRef = useRef<string | null>(null);

  // Validate focusedNodeId against current nodes: fall back to first node
  // if the focused node was removed or hasn't been initialized yet.
  const resolvedId = useMemo(() => {
    if (nodes.length === 0) return null;
    if (focusedNodeId && nodes.some((n) => n.id === focusedNodeId)) return focusedNodeId;
    return nodes[0].id;
  }, [nodes, focusedNodeId]);

  focusedRef.current = resolvedId;

  useEffect(() => {
    nodes.forEach((node) => {
      const el = document.querySelector(`[data-id="${node.id}"]`);
      if (el instanceof HTMLElement) {
        el.tabIndex = node.id === resolvedId ? 0 : -1;
      }
    });
  }, [nodes, resolvedId]);

  const moveFocus = useCallback((nodeId: string) => {
    const prevId = focusedRef.current;
    if (prevId) {
      const prevEl = document.querySelector(`[data-id="${prevId}"]`);
      if (prevEl instanceof HTMLElement) prevEl.tabIndex = -1;
    }
    const nextEl = document.querySelector(`[data-id="${nodeId}"]`);
    if (nextEl instanceof HTMLElement) {
      nextEl.tabIndex = 0;
      nextEl.focus();
    }
    setFocusedNodeId(nodeId);
  }, []);

  return { focusedNodeId: resolvedId, moveFocus };
}
