/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { EuiThemeProvider } from '@elastic/eui';
import { MemoryRouter } from 'react-router-dom';
import type { ElementDefinition } from 'cytoscape';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

/**
 * Test wrapper component that provides all required context providers
 * for React Flow Service Map components
 */
export function ReactFlowTestWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter
      initialEntries={[
        '/service-map?rangeFrom=now-15m&rangeTo=now&environment=ENVIRONMENT_ALL&kuery=',
      ]}
    >
      <MockApmPluginContextWrapper>
        <EuiThemeProvider>
          <ReactFlowProvider>{children}</ReactFlowProvider>
        </EuiThemeProvider>
      </MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

/**
 * Create a mock service node element
 */
export function createMockServiceNode(
  id: string,
  options: {
    agentName?: string;
    healthStatus?: ServiceHealthStatus;
  } = {}
): ElementDefinition {
  return {
    data: {
      id,
      'service.name': id,
      'agent.name': options.agentName ?? 'java',
      serviceAnomalyStats: options.healthStatus
        ? { healthStatus: options.healthStatus }
        : undefined,
    },
  };
}

/**
 * Create a mock dependency node element
 */
export function createMockDependencyNode(
  id: string,
  options: {
    spanType?: string;
    spanSubtype?: string;
    label?: string;
  } = {}
): ElementDefinition {
  return {
    data: {
      id,
      'span.type': options.spanType ?? 'db',
      'span.subtype': options.spanSubtype ?? 'postgresql',
      'span.destination.service.resource': options.label ?? id,
    },
  };
}

/**
 * Create a mock edge element
 */
export function createMockEdge(
  source: string,
  target: string,
  options: {
    bidirectional?: boolean;
  } = {}
): ElementDefinition {
  return {
    data: {
      id: `${source}-${target}`,
      source,
      target,
      bidirectional: options.bidirectional,
    },
  };
}

/**
 * Configuration for creating mock service map elements
 */
export interface MockElementsConfig {
  services?: Array<{
    id: string;
    agentName?: string;
    healthStatus?: ServiceHealthStatus;
  }>;
  dependencies?: Array<{
    id: string;
    spanType?: string;
    spanSubtype?: string;
  }>;
  edges?: Array<{
    source: string;
    target: string;
    bidirectional?: boolean;
  }>;
}

/**
 * Create a complete set of mock elements for testing
 */
export function createMockElements(config: MockElementsConfig): ElementDefinition[] {
  const elements: ElementDefinition[] = [];

  // Add service nodes
  config.services?.forEach((service) => {
    elements.push(
      createMockServiceNode(service.id, {
        agentName: service.agentName,
        healthStatus: service.healthStatus,
      })
    );
  });

  // Add dependency nodes
  config.dependencies?.forEach((dep) => {
    elements.push(
      createMockDependencyNode(dep.id, {
        spanType: dep.spanType,
        spanSubtype: dep.spanSubtype,
      })
    );
  });

  // Add edges
  config.edges?.forEach((edge) => {
    elements.push(
      createMockEdge(edge.source, edge.target, {
        bidirectional: edge.bidirectional,
      })
    );
  });

  return elements;
}

/**
 * Predefined mock data scenarios for common test cases
 */
export const mockScenarios = {
  /**
   * Simple linear chain: serviceA -> serviceB -> database
   */
  simpleChain: createMockElements({
    services: [
      { id: 'opbeans-java', agentName: 'java' },
      { id: 'opbeans-node', agentName: 'nodejs' },
    ],
    dependencies: [{ id: 'postgresql', spanType: 'db', spanSubtype: 'postgresql' }],
    edges: [
      { source: 'opbeans-java', target: 'opbeans-node' },
      { source: 'opbeans-node', target: 'postgresql' },
    ],
  }),

  /**
   * Complex graph with multiple services, dependencies, and bidirectional edges
   */
  complexGraph: createMockElements({
    services: [
      { id: 'api-gateway', agentName: 'nodejs' },
      { id: 'user-service', agentName: 'java' },
      { id: 'order-service', agentName: 'python' },
      { id: 'payment-service', agentName: 'go' },
      { id: 'notification-service', agentName: 'dotnet' },
    ],
    dependencies: [
      { id: 'postgresql', spanType: 'db', spanSubtype: 'postgresql' },
      { id: 'redis', spanType: 'cache', spanSubtype: 'redis' },
      { id: 'kafka', spanType: 'messaging', spanSubtype: 'kafka' },
    ],
    edges: [
      { source: 'api-gateway', target: 'user-service' },
      { source: 'api-gateway', target: 'order-service' },
      { source: 'user-service', target: 'order-service', bidirectional: true },
      { source: 'order-service', target: 'payment-service' },
      { source: 'payment-service', target: 'notification-service' },
      { source: 'user-service', target: 'postgresql' },
      { source: 'order-service', target: 'postgresql' },
      { source: 'user-service', target: 'redis' },
      { source: 'notification-service', target: 'kafka' },
    ],
  }),

  /**
   * Single isolated service with no connections
   */
  singleService: createMockElements({
    services: [{ id: 'standalone-service', agentName: 'java' }],
    dependencies: [],
    edges: [],
  }),

  /**
   * Services with various health statuses
   */
  healthStatuses: createMockElements({
    services: [
      { id: 'healthy-service', agentName: 'java' },
      { id: 'warning-service', agentName: 'nodejs', healthStatus: ServiceHealthStatus.warning },
      { id: 'critical-service', agentName: 'python', healthStatus: ServiceHealthStatus.critical },
    ],
    dependencies: [],
    edges: [
      { source: 'healthy-service', target: 'warning-service' },
      { source: 'warning-service', target: 'critical-service' },
    ],
  }),

  /**
   * Empty graph (no elements)
   */
  empty: [],
};

/**
 * Default props for ReactFlowServiceMap component tests
 */
export const defaultReactFlowProps = {
  elements: mockScenarios.simpleChain,
  height: 600,
  serviceName: undefined,
  status: FETCH_STATUS.SUCCESS,
  environment: 'ENVIRONMENT_ALL' as const,
  kuery: '',
  start: '2021-10-10T00:00:00.000Z',
  end: '2021-10-10T00:15:00.000Z',
};
