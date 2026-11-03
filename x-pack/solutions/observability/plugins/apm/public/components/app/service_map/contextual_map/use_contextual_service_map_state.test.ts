/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import {
  CONTEXTUAL_MAP_DEFAULT_BASE_MAX_HOPS,
  CONTEXTUAL_MAP_DEFAULT_MAX_VISIBLE_NODES,
} from './constants';
import { useContextualServiceMapState } from './use_contextual_service_map_state';

describe('useContextualServiceMapState', () => {
  it('starts with defaults and no expansions', () => {
    const { result } = renderHook(() => useContextualServiceMapState({ serviceName: 'svc-a' }));

    expect(result.current.baseMaxHops).toBe(CONTEXTUAL_MAP_DEFAULT_BASE_MAX_HOPS);
    expect(result.current.maxVisibleNodes).toBe(CONTEXTUAL_MAP_DEFAULT_MAX_VISIBLE_NODES);
    expect(result.current.expandedNodeIds.size).toBe(0);
    expect(result.current.hasExpandedNodes).toBe(false);
  });

  it('expands and collapses nodes immutably', () => {
    const { result } = renderHook(() => useContextualServiceMapState({ serviceName: 'svc-a' }));

    act(() => result.current.onExpand('node-1'));
    const afterExpand = result.current.expandedNodeIds;
    expect([...afterExpand]).toEqual(['node-1']);
    expect(result.current.hasExpandedNodes).toBe(true);

    act(() => result.current.onCollapse('node-1'));
    expect(result.current.expandedNodeIds.size).toBe(0);
    expect(result.current.expandedNodeIds).not.toBe(afterExpand);
  });

  it('resets expansions when hops or max visible change', () => {
    const { result } = renderHook(() => useContextualServiceMapState({ serviceName: 'svc-a' }));

    act(() => result.current.onExpand('node-1'));
    act(() => result.current.onBaseMaxHopsChange(3));
    expect(result.current.baseMaxHops).toBe(3);
    expect(result.current.expandedNodeIds.size).toBe(0);

    act(() => result.current.onExpand('node-2'));
    act(() => result.current.onMaxVisibleNodesChange(20));
    expect(result.current.maxVisibleNodes).toBe(20);
    expect(result.current.expandedNodeIds.size).toBe(0);
  });

  it('resets expansions when the focal service changes', () => {
    const { result, rerender } = renderHook(
      ({ serviceName }) => useContextualServiceMapState({ serviceName }),
      { initialProps: { serviceName: 'svc-a' } }
    );

    act(() => result.current.onExpand('node-1'));
    expect(result.current.hasExpandedNodes).toBe(true);

    rerender({ serviceName: 'svc-b' });
    expect(result.current.expandedNodeIds.size).toBe(0);
  });
});
