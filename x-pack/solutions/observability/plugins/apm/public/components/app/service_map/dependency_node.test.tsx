/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { DependencyNode } from './dependency_node';
import type { DependencyNodeData } from '../../../../common/service_map';
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
  getSpanIcon: jest.fn((type?: string) => (type ? 'mock-span-icon.svg' : undefined)),
}));

const defaultNodeProps = {
  id: 'test-dependency',
  type: 'dependency' as const,
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

function createDependencyNodeData(overrides: Partial<DependencyNodeData> = {}): DependencyNodeData {
  return {
    id: 'test-dependency',
    label: 'postgresql:5432',
    isService: false,
    spanType: 'db',
    spanSubtype: 'postgresql',
    ...overrides,
  };
}

function renderDependencyNode(
  data: DependencyNodeData = createDependencyNodeData(),
  selected: boolean = false
) {
  return render(
    <ReactFlowProvider>
      <DependencyNode {...defaultNodeProps} data={data} selected={selected} draggable />
    </ReactFlowProvider>
  );
}

describe('DependencyNode', () => {
  it('renders dependency label', () => {
    renderDependencyNode();
    expect(screen.getByText('postgresql:5432')).toBeInTheDocument();
  });

  it('renders span icon when spanType is provided', () => {
    renderDependencyNode();
    const icon = screen.getByAltText('db');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', 'mock-span-icon.svg');
  });

  it('renders with data-test-subj attribute', () => {
    renderDependencyNode();
    expect(screen.getByTestId('serviceMapNode-dependency-test-dependency')).toBeInTheDocument();
  });

  it('applies primary color when selected', () => {
    renderDependencyNode(createDependencyNodeData(), true);
    const label = screen.getByText('postgresql:5432');
    expect(label).toBeInTheDocument();
  });

  it('renders with different span types', () => {
    renderDependencyNode(
      createDependencyNodeData({
        label: 'redis:6379',
        spanType: 'cache',
        spanSubtype: 'redis',
      })
    );
    expect(screen.getByText('redis:6379')).toBeInTheDocument();
    expect(screen.getByAltText('cache')).toBeInTheDocument();
  });

  it('renders without icon when spanType is not provided', () => {
    renderDependencyNode(createDependencyNodeData({ spanType: undefined }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
