/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import type { ServiceNodeData } from '../../../../common/service_map';
import { useServiceMapFlyoutProps } from './use_service_map_flyout_props';

function makeNode(overrides: Partial<ServiceNodeData> = {}): Node<ServiceNodeData> {
  return {
    id: 'opbeans-java',
    position: { x: 0, y: 0 },
    data: {
      id: 'opbeans-java',
      label: 'opbeans-java',
      isService: true,
      agentName: 'java',
      sloStatus: 'healthy',
      sloCount: 2,
      ...overrides,
    },
  };
}

const BASE_ARGS = {
  environment: 'production',
  flyoutOptions: undefined,
  start: '2026-01-01T00:00:00.000Z',
  end: '2026-01-02T00:00:00.000Z',
} as const;

describe('useServiceMapFlyoutProps', () => {
  it('returns null when no node is selected', () => {
    const { result } = renderHook(() =>
      useServiceMapFlyoutProps({ ...BASE_ARGS, selectedServiceNodeForFlyout: null })
    );

    expect(result.current).toBeNull();
  });

  it('returns service and filters from node data', () => {
    const node = makeNode();
    const { result } = renderHook(() =>
      useServiceMapFlyoutProps({ ...BASE_ARGS, selectedServiceNodeForFlyout: node })
    );

    expect(result.current).toEqual({
      service: {
        name: 'opbeans-java',
        agentName: 'java',
        sloStatus: 'healthy',
        sloCount: 2,
      },
      filters: {
        environment: 'production',
        rangeFrom: BASE_ARGS.start,
        rangeTo: BASE_ARGS.end,
        transactionType: undefined,
      },
    });
  });

  it('uses flyoutOptions range over start/end when provided', () => {
    const node = makeNode();
    const { result } = renderHook(() =>
      useServiceMapFlyoutProps({
        ...BASE_ARGS,
        selectedServiceNodeForFlyout: node,
        flyoutOptions: {
          rangeFrom: 'now-1h',
          rangeTo: 'now',
          transactionType: 'request',
        },
      })
    );

    expect(result.current?.filters).toEqual({
      environment: 'production',
      rangeFrom: 'now-1h',
      rangeTo: 'now',
      transactionType: 'request',
    });
  });

  it('falls back to start/end when flyoutOptions has no range', () => {
    const node = makeNode();
    const { result } = renderHook(() =>
      useServiceMapFlyoutProps({
        ...BASE_ARGS,
        selectedServiceNodeForFlyout: node,
        flyoutOptions: { transactionType: 'worker' },
      })
    );

    expect(result.current?.filters).toEqual({
      environment: 'production',
      rangeFrom: BASE_ARGS.start,
      rangeTo: BASE_ARGS.end,
      transactionType: 'worker',
    });
  });
});
