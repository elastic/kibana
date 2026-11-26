/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { ServiceGroupBoxNodeData } from '../../../../common/service_map';
import { ServiceGroupBoxNode } from './service_group_box_node';
import { ServiceMapInteractivityProvider } from './service_map_interactivity_context';
import { ServiceMapGroupActionsProvider } from './service_map_group_actions_context';
import { ServiceMapHighlightProvider, useServiceMapHighlight } from './service_map_search_context';

const defaultNodeProps = {
  id: 'service.namespace:shop',
  type: 'serviceGroupBox' as const,
  selected: false,
  dragging: false,
  draggable: true,
  zIndex: 0,
  isConnectable: false,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  deletable: false,
  selectable: false,
  parentId: undefined,
  sourcePosition: undefined,
  targetPosition: undefined,
  dragHandle: undefined,
  width: 500,
  height: 300,
};

const data: ServiceGroupBoxNodeData = {
  id: 'service.namespace:shop',
  label: 'shop',
  isService: false,
  isServiceGroupBox: true,
  groupKind: 'attribute',
  memberServiceIds: ['frontend', 'cart', 'checkout'],
  memberCount: 3,
};

const renderBox = ({
  isInteractive = true,
  closeGroup,
}: {
  isInteractive?: boolean;
  closeGroup?: (groupId: string) => void;
} = {}) =>
  render(
    <ReactFlowProvider>
      <ServiceMapInteractivityProvider isInteractive={isInteractive}>
        <ServiceMapGroupActionsProvider closeGroup={closeGroup}>
          <ServiceGroupBoxNode {...defaultNodeProps} data={data} />
        </ServiceMapGroupActionsProvider>
      </ServiceMapInteractivityProvider>
    </ReactFlowProvider>
  );

describe('ServiceGroupBoxNode', () => {
  it('shows the group name and how many services it holds', () => {
    renderBox({ closeGroup: jest.fn() });

    expect(screen.getByTestId('serviceMapNodeServiceGroupBoxLabel')).toHaveTextContent('shop');
    expect(screen.getByTestId('serviceMapNodeServiceGroupBoxCount')).toHaveTextContent(
      '3 services'
    );
  });

  it('describes itself as an open group that Enter or Escape closes', () => {
    renderBox({ closeGroup: jest.fn() });

    expect(screen.getByRole('group')).toHaveAttribute(
      'aria-label',
      'Open service group: shop, 3 services. Press Enter or Escape to close the group.'
    );
  });

  it('closes the group from a labelled button', () => {
    const closeGroup = jest.fn();
    renderBox({ closeGroup });

    fireEvent.click(screen.getByRole('button', { name: 'Close group shop' }));

    expect(closeGroup).toHaveBeenCalledWith('service.namespace:shop');
  });

  it('has no close button when the map is not interactive', () => {
    renderBox({ isInteractive: false, closeGroup: jest.fn() });

    expect(screen.queryByTestId('serviceMapNodeServiceGroupBoxClose')).not.toBeInTheDocument();
  });

  it('has no close button when the map cannot close groups', () => {
    renderBox();

    expect(screen.queryByTestId('serviceMapNodeServiceGroupBoxClose')).not.toBeInTheDocument();
  });

  describe('find in page', () => {
    function SetActiveMatch({ activeMatchNodeId }: { activeMatchNodeId: string | null }) {
      const { setSearchHighlight } = useServiceMapHighlight();
      useEffect(() => {
        setSearchHighlight({
          matchNodeIds: new Set(activeMatchNodeId ? [activeMatchNodeId] : []),
          activeMatchNodeId,
        });
      }, [activeMatchNodeId, setSearchHighlight]);
      return null;
    }

    const renderWithActiveMatch = (activeMatchNodeId: string | null) =>
      render(
        <ReactFlowProvider>
          <ServiceMapHighlightProvider>
            <SetActiveMatch activeMatchNodeId={activeMatchNodeId} />
            <ServiceGroupBoxNode {...defaultNodeProps} data={data} />
          </ServiceMapHighlightProvider>
        </ReactFlowProvider>
      );

    it('marks the box when it is the active match', () => {
      renderWithActiveMatch(data.id);

      expect(screen.getByRole('group')).toHaveAttribute('data-search-active-match', 'true');
    });

    it('does not mark the box when another node is the active match', () => {
      renderWithActiveMatch('frontend');

      expect(screen.getByRole('group')).not.toHaveAttribute('data-search-active-match');
    });
  });
});
