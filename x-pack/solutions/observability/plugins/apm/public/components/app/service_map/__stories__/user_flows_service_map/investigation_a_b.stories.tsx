/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import type { NodeTypes } from '@xyflow/react';
import type { EdgeTypes } from '@xyflow/react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import type { Edge } from '@xyflow/react';
import { MockApmPluginStorybook } from '../../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { ServiceNode } from '../../service_node';
import { DependencyNode } from '../../dependency_node';
import { ServiceMapEdge as ServiceMapEdgeComponent } from '../../service_map_edge';
import { applyDagreLayout } from '../../layout';
import type { ServiceMapNode } from '../../../../../../common/service_map';
import {
  DEFAULT_EDGE_COLOR,
  DEFAULT_EDGE_STROKE_WIDTH,
  DEFAULT_MARKER_SIZE,
} from '../../../../../../common/service_map/constants';
import { ServiceMapEdgeWithLabel } from './service_map_edge_with_label';

const DANGER_COLOR = '#BD271E';

const PROBLEM_EDGE_ID = 'service-a~service-b';
const FOCUS_NODE_IDS = new Set(['service-a', 'service-b']);
const FADED_OPACITY = 0.35;

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  dependency: DependencyNode,
};

const edgeTypes: EdgeTypes = {
  default: ServiceMapEdgeComponent,
  withLabel: ServiceMapEdgeWithLabel,
};

function getHeight() {
  return window.innerHeight - 280;
}

function createDefaultEdgeStyle(color: string = DEFAULT_EDGE_COLOR) {
  return {
    type: 'default' as const,
    style: { stroke: color, strokeWidth: DEFAULT_EDGE_STROKE_WIDTH },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: DEFAULT_MARKER_SIZE,
      height: DEFAULT_MARKER_SIZE,
      color,
    },
  };
}

function createProblemEdgeStyle(label: string, animated: boolean) {
  return {
    type: 'withLabel' as const,
    style: { stroke: DANGER_COLOR, strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: DEFAULT_MARKER_SIZE,
      height: DEFAULT_MARKER_SIZE,
      color: DANGER_COLOR,
    },
    data: {
      label,
      isDanger: true,
      isDashed: true,
      animated,
      isBidirectional: false,
    },
  };
}

const TIME_RANGE_OPTIONS = [
  { value: '15m', text: 'Last 15 min' },
  { value: '1h', text: 'Last 1 hour' },
  { value: '24h', text: 'Last 24 hours' },
];

const BASE_NODES: ServiceMapNode[] = [
  {
    id: 'service-a',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'service-a',
      label: 'service-a',
      isService: true,
      agentName: 'nodejs',
    },
  },
  {
    id: 'service-b',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'service-b',
      label: 'service-b',
      isService: true,
      agentName: 'go',
    },
  },
  {
    id: 'service-c',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'service-c',
      label: 'service-c',
      isService: true,
      agentName: 'java',
    },
  },
  {
    id: 'service-d',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'service-d',
      label: 'service-d',
      isService: true,
      agentName: 'python',
    },
  },
  {
    id: 'postgresql',
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id: 'postgresql',
      label: 'postgresql',
      isService: false,
      spanType: 'db',
      spanSubtype: 'postgresql',
    },
  },
];

const BASE_EDGES: Edge[] = [
  {
    id: 'service-a~service-c',
    source: 'service-a',
    target: 'service-c',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'service-c~service-b',
    source: 'service-c',
    target: 'service-b',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: PROBLEM_EDGE_ID,
    source: 'service-a',
    target: 'service-b',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'service-b~service-d',
    source: 'service-b',
    target: 'service-d',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'service-d~postgresql',
    source: 'service-d',
    target: 'postgresql',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
];

const meta: Meta = {
  title: 'app/ServiceMap/User Flows – Service Map/Investigation (A → B)',
  decorators: [
    (Story) => (
      <MockApmPluginStorybook routePath="/service-map?rangeFrom=now-15m&rangeTo=now">
        <Story />
      </MockApmPluginStorybook>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'Demo: filter the map to investigate issues between Service A and B. Use time range and focus filters, then expand scope to see the full map. Faded nodes and red animated edge show the problem path and failed requests. Data is mocked.',
      },
    },
  },
};

export default meta;

export const InvestigationAB: StoryFn = () => {
  const [timeRange, setTimeRange] = useState('15m');
  const [focusAtoB, setFocusAtoB] = useState(true);
  const [expandedScope, setExpandedScope] = useState(false);

  const effectiveFocus = expandedScope ? false : focusAtoB;

  const handleExpandScope = useCallback(() => {
    setExpandedScope(true);
    setFocusAtoB(false);
  }, []);

  const nodes = useMemo(() => {
    const withStyle = BASE_NODES.map((node) => {
      if (effectiveFocus && !FOCUS_NODE_IDS.has(node.id)) {
        return { ...node, style: { ...node.style, opacity: FADED_OPACITY } };
      }
      return { ...node, style: { ...node.style, opacity: 1 } };
    });
    return applyDagreLayout(withStyle, BASE_EDGES);
  }, [effectiveFocus]);

  const edges = useMemo(() => {
    return BASE_EDGES.map((edge) => {
      if (edge.id === PROBLEM_EDGE_ID && effectiveFocus) {
        return {
          ...edge,
          ...createProblemEdgeStyle('3 failed requests', true),
        } as Edge;
      }
      if (effectiveFocus && edge.id !== PROBLEM_EDGE_ID) {
        return {
          ...edge,
          style: { ...(edge.style ?? {}), opacity: FADED_OPACITY },
        };
      }
      return edge;
    });
  }, [effectiveFocus]);

  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

  useEffect(() => {
    setNodes(nodes);
    setEdges(edges);
  }, [nodes, edges, setNodes, setEdges]);

  return (
    <div style={{ padding: 16 }}>
      <style>
        {`
          .serviceMapEdgeWithLabel--animated path {
            animation: investigationDash 1.2s linear infinite;
          }
          @keyframes investigationDash {
            to { stroke-dashoffset: -20; }
          }
        `}
      </style>

      <EuiCallOut size="s" title="User flow: Investigation (Service A → B)" iconType="search">
        <p>
          Filter the map to problems between <strong>Service A</strong> and{' '}
          <strong>Service B</strong>: set time range and turn on &quot;Focus: A → B&quot;. Faded
          nodes are outside the focus; the red animated edge shows failed requests. Use &quot;Expand
          scope&quot; to see the full map again. Data is mocked.
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="center" wrap gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFormLabel>Time range</EuiFormLabel>
          <EuiSpacer size="xs" />
          <EuiSelect
            id="investigation-time-range"
            options={TIME_RANGE_OPTIONS}
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            data-test-subj="investigationTimeRangeSelect"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Focus: Service A → B"
            checked={focusAtoB && !expandedScope}
            onChange={(e) => {
              setFocusAtoB(e.target.checked);
              if (e.target.checked) setExpandedScope(false);
            }}
            data-test-subj="investigationFocusAtoB"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={handleExpandScope}
            iconType="expand"
            fill={expandedScope}
            data-test-subj="investigationExpandScope"
          >
            Expand scope
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {effectiveFocus
            ? 'Focused on A → B: problem edge highlighted, other nodes/edges faded.'
            : 'Full map visible. Use "Focus: Service A → B" to filter.'}
          {expandedScope && ' Scope expanded.'}
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      <div style={{ height: getHeight(), width: '100%' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodesState}
            edges={edgesState}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export const InvestigationABDefault: StoryObj = {
  render: () => <InvestigationAB />,
};
