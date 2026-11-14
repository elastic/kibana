/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type {
  ServiceMapEdge,
  ServiceMapGrouping,
  ServiceMapNode,
} from '../../../../common/service_map';
import { createEdgeMarker, getEdgeId } from '../../../../common/service_map';
import { DEFAULT_EDGE_STYLE } from '../../../../common/service_map/constants';
import { useServiceMapGroupingEnabled } from '../../../hooks/use_service_map_grouping_enabled';
import { useServiceMapClosedGroups } from './use_service_map_closed_groups';

jest.mock('../../../hooks/use_service_map_grouping_enabled', () => ({
  useServiceMapGroupingEnabled: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({ search: '' }),
}));

const mockedUseServiceMapGroupingEnabled = jest.mocked(useServiceMapGroupingEnabled);

function serviceNode(id: string): ServiceMapNode {
  return {
    id,
    type: 'service',
    position: { x: 0, y: 0 },
    data: { id, label: id, isService: true },
  };
}

function edge(source: string, target: string): ServiceMapEdge {
  return {
    id: getEdgeId(source, target),
    source,
    target,
    type: 'default',
    style: DEFAULT_EDGE_STYLE,
    markerEnd: createEdgeMarker(DEFAULT_EDGE_STYLE.stroke),
    data: { isBidirectional: false },
  };
}

describe('useServiceMapClosedGroups', () => {
  const nodes = [serviceNode('a'), serviceNode('b')];
  const edges = [edge('a', 'b')];

  /** Would collapse a+b into one square when the flag is on. */
  const collapsibleGrouping: ServiceMapGrouping = {
    services: ['a', 'b'],
    automatic: 'namePrefix',
    strategies: [
      {
        source: 'namePrefix',
        passes: true,
        groups: [
          { id: 'namePrefix:app', kind: 'attribute', attribute: 'namePrefix', value: 'app' },
        ],
        assignment: [0, 0],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not collapse when the grouping flag is off, even if serviceGrouping is present', () => {
    mockedUseServiceMapGroupingEnabled.mockReturnValue(false);

    const { result } = renderHook(() =>
      useServiceMapClosedGroups({
        nodes,
        edges,
        serviceGrouping: collapsibleGrouping,
      })
    );

    expect(result.current.nodes).toBe(nodes);
    expect(result.current.edges).toBe(edges);
    expect(result.current.countLine).toBeUndefined();
  });

  it('passes through when the flag is on but there is no grouping', () => {
    mockedUseServiceMapGroupingEnabled.mockReturnValue(true);

    const { result } = renderHook(() =>
      useServiceMapClosedGroups({ nodes, edges, serviceGrouping: undefined })
    );

    expect(result.current.nodes).toBe(nodes);
    expect(result.current.edges).toBe(edges);
    expect(result.current.countLine).toBeUndefined();
  });

  it('omits the count line when grouping is present but nothing collapses', () => {
    mockedUseServiceMapGroupingEnabled.mockReturnValue(true);
    const grouping: ServiceMapGrouping = {
      services: ['a', 'b'],
      automatic: 'namePrefix',
      strategies: [
        {
          source: 'namePrefix',
          passes: true,
          groups: [
            { id: 'namePrefix:a', kind: 'attribute', attribute: 'namePrefix', value: 'a' },
            { id: 'namePrefix:b', kind: 'attribute', attribute: 'namePrefix', value: 'b' },
          ],
          // Each service alone → groups of 1 stay as service nodes.
          assignment: [0, 1],
        },
      ],
    };

    const { result } = renderHook(() =>
      useServiceMapClosedGroups({ nodes, edges, serviceGrouping: grouping })
    );

    expect(result.current.nodes).toHaveLength(2);
    expect(result.current.countLine).toBeUndefined();
  });

  it('returns a count line when at least one closed group is drawn', () => {
    mockedUseServiceMapGroupingEnabled.mockReturnValue(true);

    const { result } = renderHook(() =>
      useServiceMapClosedGroups({
        nodes,
        edges,
        serviceGrouping: collapsibleGrouping,
      })
    );

    expect(result.current.countLine).toBe('2 services in 1 group, by name prefix');
  });
});
