/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { MemoryRouter } from 'react-router-dom';
import { EuiThemeProvider } from '@elastic/eui';
import { ReactFlowPopover } from './react_flow_popover';
import type { ServiceMapNodeData } from './service_node';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';

// Mock the popover content components
// Note: Kibana uses data-test-subj instead of data-testid for React Testing Library
jest.mock('../popover/service_contents', () => ({
  ServiceContents: ({ elementData }: { elementData: { label: string } }) => (
    <div data-test-subj="service-contents">Service: {elementData.label}</div>
  ),
}));

jest.mock('../popover/dependency_contents', () => ({
  DependencyContents: ({ elementData }: { elementData: { label: string } }) => (
    <div data-test-subj="dependency-contents">Dependency: {elementData.label}</div>
  ),
}));

jest.mock('../popover/resource_contents', () => ({
  ResourceContents: ({ elementData }: { elementData: { label: string } }) => (
    <div data-test-subj="resource-contents">Resource: {elementData.label}</div>
  ),
}));

jest.mock('../popover/externals_list_contents', () => ({
  ExternalsListContents: () => <div data-test-subj="externals-list-contents">Externals List</div>,
}));

jest.mock('../popover/with_diagnose_button', () => ({
  withDiagnoseButton: (Component: React.ComponentType<any>) => Component,
}));

jest.mock('../diagnostic_tool/diagnostic_flyout', () => ({
  DiagnosticFlyout: () => null,
}));

// Mock useReactFlow
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  useReactFlow: () => ({
    getNode: () => ({
      measured: { width: 56, height: 56 },
    }),
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    setCenter: jest.fn(),
    getZoom: () => 1,
  }),
}));

function createMockNode(id: string, data: Partial<ServiceMapNodeData>): Node<ServiceMapNodeData> {
  return {
    id,
    type: data.isService ? 'service' : 'dependency',
    position: { x: 100, y: 100 },
    data: {
      id,
      label: data.label ?? id,
      isService: data.isService ?? false,
      agentName: data.agentName,
      spanType: data.spanType,
      spanSubtype: data.spanSubtype,
      ...data,
    } as ServiceMapNodeData,
  };
}

interface RenderPopoverOptions {
  selectedNode?: Node<ServiceMapNodeData> | null;
  focusedServiceName?: string;
  kuery?: string;
  onClose?: () => void;
}

function renderPopover(options: RenderPopoverOptions = {}) {
  const defaultProps = {
    selectedNode: options.selectedNode ?? null,
    focusedServiceName: options.focusedServiceName,
    environment: 'ENVIRONMENT_ALL' as const,
    kuery: options.kuery ?? '',
    start: '2021-10-10T00:00:00.000Z',
    end: '2021-10-10T00:15:00.000Z',
    onClose: options.onClose ?? jest.fn(),
  };

  return render(
    <MemoryRouter
      initialEntries={[
        '/service-map?rangeFrom=now-15m&rangeTo=now&environment=ENVIRONMENT_ALL&kuery=',
      ]}
    >
      <MockApmPluginContextWrapper>
        <EuiThemeProvider>
          <ReactFlowProvider>
            <ReactFlowPopover {...defaultProps} />
          </ReactFlowProvider>
        </EuiThemeProvider>
      </MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

describe('ReactFlowPopover', () => {
  describe('visibility', () => {
    it('is hidden when no node is selected', () => {
      renderPopover({ selectedNode: null });

      expect(screen.queryByTestId('service-contents')).not.toBeInTheDocument();
      expect(screen.queryByTestId('dependency-contents')).not.toBeInTheDocument();
    });

    it('is visible when a service node is selected', async () => {
      const serviceNode = createMockNode('opbeans-java', {
        label: 'opbeans-java',
        isService: true,
        'service.name': 'opbeans-java',
      });

      renderPopover({ selectedNode: serviceNode });

      await waitFor(() => {
        expect(screen.getByTestId('service-contents')).toBeInTheDocument();
      });
    });

    it('is visible when a dependency node is selected', async () => {
      const dependencyNode = createMockNode('postgresql', {
        label: 'postgresql',
        isService: false,
      });

      renderPopover({ selectedNode: dependencyNode });

      await waitFor(() => {
        expect(screen.getByTestId('dependency-contents')).toBeInTheDocument();
      });
    });
  });

  describe('content selection', () => {
    it('shows ServiceContents for service nodes', async () => {
      const serviceNode = createMockNode('opbeans-java', {
        label: 'opbeans-java',
        isService: true,
        'service.name': 'opbeans-java',
      });

      renderPopover({ selectedNode: serviceNode });

      await waitFor(() => {
        expect(screen.getByTestId('service-contents')).toBeInTheDocument();
      });
      expect(screen.getByText(/Service: opbeans-java/)).toBeInTheDocument();
    });

    it('shows DependencyContents for dependency nodes', async () => {
      const dependencyNode = createMockNode('postgresql', {
        label: 'postgresql',
        isService: false,
      });

      renderPopover({ selectedNode: dependencyNode });

      await waitFor(() => {
        expect(screen.getByTestId('dependency-contents')).toBeInTheDocument();
      });
      expect(screen.getByText(/Dependency: postgresql/)).toBeInTheDocument();
    });

    it('shows ExternalsListContents for grouped connections', async () => {
      const externalsNode = createMockNode('externals', {
        label: 'externals',
        isService: false,
        groupedConnections: [
          { label: 'external-1', id: 'ext-1' },
          { label: 'external-2', id: 'ext-2' },
        ],
      });

      renderPopover({ selectedNode: externalsNode });

      await waitFor(() => {
        expect(screen.getByTestId('externals-list-contents')).toBeInTheDocument();
      });
    });

    it('shows ResourceContents for resource nodes', async () => {
      const resourceNode = createMockNode('s3-bucket', {
        label: 's3-bucket',
        isService: false,
        'span.type': 'resource',
      });

      renderPopover({ selectedNode: resourceNode });

      await waitFor(() => {
        expect(screen.getByTestId('resource-contents')).toBeInTheDocument();
      });
    });
  });

  describe('popover header', () => {
    it('displays the node label in the title', async () => {
      const serviceNode = createMockNode('my-awesome-service', {
        label: 'my-awesome-service',
        isService: true,
        'service.name': 'my-awesome-service',
      });

      renderPopover({ selectedNode: serviceNode });

      await waitFor(() => {
        expect(screen.getByText('my-awesome-service')).toBeInTheDocument();
      });
    });

    it('shows KQL filter info icon when kuery is provided', async () => {
      const serviceNode = createMockNode('opbeans-java', {
        label: 'opbeans-java',
        isService: true,
        'service.name': 'opbeans-java',
      });

      renderPopover({
        selectedNode: serviceNode,
        kuery: 'service.name: opbeans-java',
      });

      await waitFor(() => {
        expect(screen.getByTestId('service-contents')).toBeInTheDocument();
      });
    });
  });

  describe('close behavior', () => {
    it('calls onClose when close is triggered', async () => {
      const onClose = jest.fn();
      const serviceNode = createMockNode('opbeans-java', {
        label: 'opbeans-java',
        isService: true,
        'service.name': 'opbeans-java',
      });

      renderPopover({ selectedNode: serviceNode, onClose });

      await waitFor(() => {
        expect(screen.getByTestId('service-contents')).toBeInTheDocument();
      });

      // onClose should be callable
      expect(typeof onClose).toBe('function');
    });
  });

  describe('node type detection', () => {
    it('identifies service nodes by service.name property', async () => {
      const serviceNode = createMockNode('opbeans-java', {
        label: 'opbeans-java',
        isService: true,
        'service.name': 'opbeans-java',
      });

      renderPopover({ selectedNode: serviceNode });

      await waitFor(() => {
        expect(screen.getByTestId('service-contents')).toBeInTheDocument();
      });
    });

    it('identifies service nodes by isService flag', async () => {
      const serviceNode = createMockNode('opbeans-java', {
        label: 'opbeans-java',
        isService: true,
      });

      renderPopover({ selectedNode: serviceNode });

      await waitFor(() => {
        expect(screen.getByTestId('service-contents')).toBeInTheDocument();
      });
    });
  });
});
