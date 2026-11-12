/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { ServiceGroupNode } from './service_group_node';
import type { ServiceGroupNodeData } from '../../../../common/service_map';
import { MOCK_EUI_THEME_FOR_USE_THEME } from './test_helpers';
import { ServiceMapInteractivityProvider } from './service_map_interactivity_context';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({
      euiTheme: MOCK_EUI_THEME_FOR_USE_THEME,
      colorMode: 'LIGHT',
    }),
    useEuiFontSize: () => ({ fontSize: '12px' }),
  };
});

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      application: {
        capabilities: {
          slo: { read: true },
        },
      },
    },
  }),
}));

jest.mock('./service_map_search_context', () => ({
  ...jest.requireActual('./service_map_search_context'),
  useServiceMapSearchHighlight: jest.fn(() => ({
    isSearchMatch: false,
    isActiveSearchMatch: false,
  })),
}));

const defaultNodeProps = {
  id: 'service.namespace:shop',
  type: 'serviceGroup' as const,
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

function createGroupData(overrides: Partial<ServiceGroupNodeData> = {}): ServiceGroupNodeData {
  return {
    id: 'service.namespace:shop',
    label: 'shop',
    isService: false,
    isServiceGroup: true,
    groupKind: 'attribute',
    memberServiceIds: ['frontend', 'cart', 'checkout'],
    memberCount: 3,
    ...overrides,
  };
}

describe('ServiceGroupNode', () => {
  it('shows the group name, member count, and is focusable when interactive', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapInteractivityProvider isInteractive>
          <ServiceGroupNode
            {...defaultNodeProps}
            draggable={false}
            data={createGroupData()}
            selected={false}
            type="serviceGroup"
          />
        </ServiceMapInteractivityProvider>
      </ReactFlowProvider>
    );

    expect(screen.getByTestId('serviceMapNodeServiceGroupCount')).toHaveTextContent('3 services');
    expect(screen.getByText('shop')).toBeInTheDocument();

    const shape = screen.getByTestId('serviceMapNodeServiceGroupShape');
    expect(shape).toHaveAttribute('role', 'button');
    expect(shape).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Service group: shop, 3 services')
    );
  });

  it('shows rolled-up stats and badges when present', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapInteractivityProvider isInteractive>
          <ServiceGroupNode
            {...defaultNodeProps}
            draggable={false}
            data={createGroupData({
              alertsCount: 4,
              sloStatus: 'violated',
              sloCount: 2,
              stats: {
                transactionType: 'request',
                throughput: 20,
                failedTransactionRate: 0.1,
                latency: 500,
                requestCount: 150,
              },
            })}
            selected={false}
            type="serviceGroup"
          />
        </ServiceMapInteractivityProvider>
      </ReactFlowProvider>
    );

    expect(screen.getByTestId('serviceMapNodeServiceGroupAlertsBadge')).toBeInTheDocument();
    expect(screen.getByTestId('serviceMapNodeStats')).toBeInTheDocument();
  });
});
