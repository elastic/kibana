/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { ServiceMapEdge } from './service_map_edge';
import type { ServiceMapEdgeData } from '../../../../common/service_map';
import { MOCK_PRIMARY_COLOR, MOCK_DEFAULT_COLOR, MOCK_EUI_THEME } from './constants';

// Mock EUI theme
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({
      euiTheme: {
        colors: {
          mediumShade: MOCK_EUI_THEME.colors.mediumShade,
          primary: MOCK_EUI_THEME.colors.primary,
        },
      },
      colorMode: 'LIGHT',
    }),
  };
});

const createEdgeProps = (selected: boolean = false) => ({
  id: 'edge-1',
  source: 'node-1',
  target: 'node-2',
  sourceX: 0,
  sourceY: 0,
  targetX: 100,
  targetY: 100,
  sourcePosition: Position.Bottom,
  targetPosition: Position.Top,
  sourceHandleId: undefined,
  targetHandleId: undefined,
  interactionWidth: 20,
  // Style is passed externally based on selection state
  style: selected
    ? { stroke: MOCK_PRIMARY_COLOR, strokeWidth: 2 }
    : { stroke: MOCK_DEFAULT_COLOR, strokeWidth: 1 },
});

function createEdgeData(overrides: Partial<ServiceMapEdgeData> = {}): ServiceMapEdgeData {
  return {
    isBidirectional: false,
    ...overrides,
  };
}

function renderServiceMapEdge(
  data: ServiceMapEdgeData = createEdgeData(),
  selected: boolean = false
) {
  const edgeProps = createEdgeProps(selected);
  return render(
    <ReactFlowProvider>
      <svg>
        <ServiceMapEdge {...edgeProps} data={data} selected={selected} />
      </svg>
    </ReactFlowProvider>
  );
}

describe('ServiceMapEdge', () => {
  it('renders edge path', () => {
    const { container } = renderServiceMapEdge();
    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
  });

  it('renders with default stroke color when not selected', () => {
    const { container } = renderServiceMapEdge();
    const path = container.querySelector('path');
    expect(path).toHaveAttribute('style');
    // The stroke should be mediumShade color (may be hex or rgb depending on browser)
    expect(['rgb(152, 162, 179)', MOCK_DEFAULT_COLOR]).toContain(path?.style.stroke);
  });

  it('renders with primary stroke color when selected', () => {
    const { container } = renderServiceMapEdge(createEdgeData(), true);
    const path = container.querySelector('path');
    expect(path).toHaveAttribute('style');
    // The stroke should be primary color (may be hex or rgb depending on browser)
    expect(['rgb(0, 119, 204)', MOCK_PRIMARY_COLOR]).toContain(path?.style.stroke);
  });

  it('renders with wider stroke when selected', () => {
    const { container } = renderServiceMapEdge(createEdgeData(), true);
    const path = container.querySelector('path');
    // The strokeWidth should be 2 when selected (style passed externally)
    expect(path?.style.strokeWidth).toBe('2');
  });

  it('renders unidirectional edge by default', () => {
    const { container } = renderServiceMapEdge(createEdgeData({ isBidirectional: false }));
    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
  });

  it('renders bidirectional edge when isBidirectional is true', () => {
    const { container } = renderServiceMapEdge(createEdgeData({ isBidirectional: true }));
    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
  });
});
