/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { ServiceMapEdge } from '../../../../common/service_map';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_TYPE,
} from '../../../../common/es_fields/apm';
import { useServiceMapEdgeFlyoutProps } from './use_service_map_edge_flyout_props';

// Minimal EdgeMarker shape required by ServiceMapEdge
const EDGE_MARKER = {
  type: 'arrow' as const,
  width: 8,
  height: 8,
  color: '#888',
};

/**
 * Build a minimal ServiceMapEdge. The hook only reads `data` and `target`,
 * so every other required ReactFlow field is filled with a safe default.
 */
function makeEdge(
  dataOverrides: Partial<NonNullable<ServiceMapEdge['data']>> = {},
  edgeOverrides: Partial<Pick<ServiceMapEdge, 'source' | 'target'>> = {}
): ServiceMapEdge {
  return {
    id: 'source-node>>target-node',
    source: edgeOverrides.source ?? 'source-node',
    target: edgeOverrides.target ?? 'target-node',
    type: 'default' as const,
    style: { stroke: '#888', strokeWidth: 2 },
    markerEnd: EDGE_MARKER,
    data: {
      isBidirectional: false,
      ...dataOverrides,
    },
  };
}

/** A ServiceConnectionNode that acts as an instrumented service source. */
const SOURCE_SERVICE_NODE = {
  id: 'opbeans-java',
  [SERVICE_NAME]: 'opbeans-java',
  'agent.name': 'java',
  'service.environment': 'production',
};

/** An ExternalConnectionNode that acts as a database dependency. */
const TARGET_DEPENDENCY_NODE = {
  id: 'redis',
  [SPAN_DESTINATION_SERVICE_RESOURCE]: 'redis',
  [SPAN_TYPE]: 'db',
  'span.subtype': 'redis',
};

/** A ServiceConnectionNode that acts as an instrumented service target. */
const TARGET_SERVICE_NODE = {
  id: 'opbeans-node',
  [SERVICE_NAME]: 'opbeans-node',
  'agent.name': 'nodejs',
  'service.environment': 'production',
};

function renderEdge(edge: ServiceMapEdge | null) {
  return renderHook(() => useServiceMapEdgeFlyoutProps({ selectedEdgeForFlyout: edge })).result
    .current;
}

describe('useServiceMapEdgeFlyoutProps', () => {
  it('returns null when no edge is selected', () => {
    expect(renderEdge(null)).toBeNull();
  });

  it('maps a service → dependency edge', () => {
    const connection = renderEdge(
      makeEdge({
        sourceData: SOURCE_SERVICE_NODE,
        targetData: TARGET_DEPENDENCY_NODE,
        resources: ['redis'],
      })
    );

    expect(connection).toEqual({
      sourceServiceName: 'opbeans-java',
      sourceLabel: 'opbeans-java',
      targetLabel: 'redis',
      dependencies: ['redis'],
      targetServiceName: undefined,
      dependencyName: 'redis',
    });
  });

  it('falls back to the dependency of the edge when it has no resources', () => {
    const connection = renderEdge(
      makeEdge({ sourceData: SOURCE_SERVICE_NODE, targetData: TARGET_DEPENDENCY_NODE })
    );

    expect(connection).toMatchObject({ dependencies: ['redis'], dependencyName: 'redis' });
  });

  it('maps a service → service edge', () => {
    const connection = renderEdge(
      makeEdge({
        sourceData: SOURCE_SERVICE_NODE,
        targetData: TARGET_SERVICE_NODE,
        resources: ['internal-resource'],
      })
    );

    expect(connection).toMatchObject({
      sourceServiceName: 'opbeans-java',
      targetServiceName: 'opbeans-node',
      targetLabel: 'opbeans-node',
      dependencyName: undefined,
      dependencies: ['internal-resource'],
    });
  });

  it('uses the labels of the edge when it has them', () => {
    const connection = renderEdge(
      makeEdge({
        sourceData: SOURCE_SERVICE_NODE,
        targetData: TARGET_SERVICE_NODE,
        sourceLabel: 'Java app',
        targetLabel: 'Node app',
      })
    );

    expect(connection).toMatchObject({ sourceLabel: 'Java app', targetLabel: 'Node app' });
  });

  it('has no dependencies for a service → service edge without resources', () => {
    const connection = renderEdge(
      makeEdge({ sourceData: SOURCE_SERVICE_NODE, targetData: TARGET_SERVICE_NODE })
    );

    expect(connection).toMatchObject({ dependencies: [], targetServiceName: 'opbeans-node' });
  });

  it('returns null when the source is neither a service nor a messaging queue', () => {
    expect(renderEdge(makeEdge({ targetData: TARGET_SERVICE_NODE }))).toBeNull();
  });

  it('returns a connection without metrics when the source is a messaging queue', () => {
    const queue = {
      id: 'kafka',
      [SPAN_DESTINATION_SERVICE_RESOURCE]: 'kafka',
      [SPAN_TYPE]: 'messaging',
      'span.subtype': 'kafka',
    };

    const connection = renderEdge(
      makeEdge({ sourceData: queue, targetData: TARGET_SERVICE_NODE, sourceLabel: 'kafka' })
    );

    expect(connection).toEqual({ sourceLabel: 'kafka', targetLabel: 'opbeans-node' });
  });

  describe('grouped edge (service → "N resources" node)', () => {
    // Real shape built by group_resource_nodes: no sourceData/targetData, the source is the
    // service node id and the resources are listed in groupedConnections.
    const groupedEdge = (
      groupedConnections?: NonNullable<ServiceMapEdge['data']>['groupedConnections']
    ) =>
      makeEdge(
        { isGrouped: true, groupedConnections },
        { source: 'opbeans-java', target: 'resourceGroup{opbeans-java}' }
      );

    it('lists the grouped resources and uses the edge source as the service', () => {
      const connection = renderEdge(
        groupedEdge([
          { id: '>redis-1', label: 'redis-1', spanType: 'db', spanSubtype: 'redis' },
          { id: '>redis-2', label: 'redis-2', spanType: 'db', spanSubtype: 'redis' },
        ])
      );

      expect(connection).toMatchObject({
        sourceServiceName: 'opbeans-java',
        targetLabel: '2 redis resources',
        dependencies: ['redis-1', 'redis-2'],
        groupedResources: [
          { resource: 'redis-1', spanType: 'db', spanSubtype: 'redis' },
          { resource: 'redis-2', spanType: 'db', spanSubtype: 'redis' },
        ],
      });
    });

    it('prefers span.destination.service.resource over the label', () => {
      const connection = renderEdge(
        groupedEdge([{ id: '>a', label: 'A', [SPAN_DESTINATION_SERVICE_RESOURCE]: 'resource-a' }])
      );

      expect(connection).toMatchObject({ dependencies: ['resource-a'] });
    });

    it('returns a connection without metrics for an outgoing grouped edge', () => {
      const connection = renderEdge(groupedEdge(undefined));

      expect(connection).toEqual({
        sourceLabel: 'opbeans-java',
        targetLabel: 'resourceGroup{opbeans-java}',
      });
    });
  });
});
