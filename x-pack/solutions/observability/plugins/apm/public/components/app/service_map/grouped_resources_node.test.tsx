/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { GroupedResourcesNode } from './grouped_resources_node';
import type { GroupedNodeData } from '../../../../common/service_map';
import { MOCK_EUI_THEME } from './constants';

// Mock EUI theme
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({
      euiTheme: {
        colors: {
          emptyShade: MOCK_EUI_THEME.colors.emptyShade,
          mediumShade: MOCK_EUI_THEME.colors.mediumShade,
          primary: MOCK_EUI_THEME.colors.primary,
          primaryText: MOCK_EUI_THEME.colors.primaryText,
          textPrimary: MOCK_EUI_THEME.colors.textPrimary,
          textParagraph: MOCK_EUI_THEME.colors.textParagraph,
          text: MOCK_EUI_THEME.colors.text,
          backgroundBasePlain: MOCK_EUI_THEME.colors.backgroundBasePlain,
        },
        size: {
          xs: '4px',
          s: '8px',
          m: '12px',
        },
        border: {
          radius: {
            small: '4px',
          },
          width: {
            thin: '1px',
            thick: '2px',
          },
        },
        font: {
          family: '"Inter", sans-serif',
        },
        levels: {
          header: 1000,
        },
        animation: {
          fast: '150ms',
        },
      },
      colorMode: 'LIGHT',
    }),
  };
});

// Mock the span icon
jest.mock('@kbn/apm-ui-shared', () => ({
  getSpanIcon: jest.fn(() => 'mock-span-icon.svg'),
}));

const defaultNodeProps = {
  id: 'grouped-resources',
  type: 'groupedResources' as const,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  deletable: false,
  selectable: true,
  parentId: undefined,
  sourcePosition: undefined,
  targetPosition: undefined,
  dragHandle: undefined,
  width: 64,
  height: 64,
};

function createGroupedNodeData(overrides: Partial<GroupedNodeData> = {}): GroupedNodeData {
  return {
    id: 'grouped-resources',
    label: '5 external resources',
    isService: false,
    isGrouped: true,
    spanType: 'external',
    spanSubtype: 'http',
    count: 5,
    groupedConnections: [
      {
        id: 'api1.example.com',
        label: 'api1.example.com',
        spanType: 'external',
        spanSubtype: 'http',
      },
      {
        id: 'api2.example.com',
        label: 'api2.example.com',
        spanType: 'external',
        spanSubtype: 'http',
      },
      {
        id: 'api3.example.com',
        label: 'api3.example.com',
        spanType: 'external',
        spanSubtype: 'http',
      },
      {
        id: 'api4.example.com',
        label: 'api4.example.com',
        spanType: 'external',
        spanSubtype: 'http',
      },
      {
        id: 'api5.example.com',
        label: 'api5.example.com',
        spanType: 'external',
        spanSubtype: 'http',
      },
    ],
    ...overrides,
  };
}

function renderGroupedResourcesNode(
  data: GroupedNodeData = createGroupedNodeData(),
  selected: boolean = false
) {
  return render(
    <ReactFlowProvider>
      <GroupedResourcesNode {...defaultNodeProps} data={data} selected={selected} draggable />
    </ReactFlowProvider>
  );
}

describe('GroupedResourcesNode', () => {
  it('renders grouped resources label', () => {
    renderGroupedResourcesNode();
    expect(screen.getByText('5 external resources')).toBeInTheDocument();
  });

  it('renders count badge with correct count', () => {
    renderGroupedResourcesNode();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders span icon when spanType is provided', () => {
    renderGroupedResourcesNode();
    const icon = screen.getByAltText('external');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', 'mock-span-icon.svg');
  });

  it('renders with data-test-subj attribute', () => {
    renderGroupedResourcesNode();
    expect(
      screen.getByTestId('serviceMapNode-groupedResources-grouped-resources')
    ).toBeInTheDocument();
  });

  it('applies primary color when selected', () => {
    renderGroupedResourcesNode(createGroupedNodeData(), true);
    const label = screen.getByText('5 external resources');
    expect(label).toBeInTheDocument();
  });

  it('renders with different counts', () => {
    renderGroupedResourcesNode(
      createGroupedNodeData({
        count: 10,
        label: '10 external resources',
      })
    );
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('10 external resources')).toBeInTheDocument();
  });
});
