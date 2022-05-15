/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { SecurityPageName } from '../../../../app/types';
import { TestProviders } from '../../../mock';
import { PortalNavItem } from './solution_grouped_nav_item';
import {
  SolutionGroupedNavPanel,
  SolutionGroupedNavPanelProps,
} from './solution_grouped_nav_panel';

const mockUseShowTimeline = jest.fn((): [boolean] => [false]);
jest.mock('../../../utils/timeline/use_show_timeline', () => ({
  useShowTimeline: () => mockUseShowTimeline(),
}));

const mockItems: PortalNavItem[] = [
  {
    id: SecurityPageName.hosts,
    label: 'Hosts',
    href: '/hosts',
    description: 'Hosts description',
  },
  {
    id: SecurityPageName.network,
    label: 'Network',
    href: '/network',
    description: 'Network description',
  },
];

const PANEL_TITLE = 'test title';
const mockOnClose = jest.fn();
const renderNavPanel = (props: Partial<SolutionGroupedNavPanelProps> = {}) =>
  render(
    <>
      <div data-test-subj="outsideClickDummy" />
      <SolutionGroupedNavPanel
        items={mockItems}
        title={PANEL_TITLE}
        onClose={mockOnClose}
        {...props}
      />
    </>,
    {
      wrapper: TestProviders,
    }
  );

describe('SolutionGroupedNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all main items', () => {
    const result = renderNavPanel();

    expect(result.getByText(PANEL_TITLE)).toBeInTheDocument();

    mockItems.forEach((item) => {
      expect(result.getByText(item.label)).toBeInTheDocument();
      if (item.description) {
        expect(result.getByText(item.description)).toBeInTheDocument();
      }
    });
  });

  describe('links', () => {
    it('should contain correct href in links', () => {
      const result = renderNavPanel();
      expect(
        result.getByTestId(`groupedNavPanelLink-${SecurityPageName.hosts}`).getAttribute('href')
      ).toBe('/hosts');
      expect(
        result.getByTestId(`groupedNavPanelLink-${SecurityPageName.network}`).getAttribute('href')
      ).toBe('/network');
    });

    it('should call onClick callback if link clicked', () => {
      const mockOnClick = jest.fn((ev) => {
        ev.preventDefault();
      });
      const items = [
        ...mockItems,
        {
          id: SecurityPageName.users,
          label: 'Users',
          href: '/users',
          onClick: mockOnClick,
        },
      ];
      const result = renderNavPanel({ items });
      result.getByTestId(`groupedNavPanelLink-${SecurityPageName.users}`).click();
      expect(mockOnClick).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should call onClose callback if link clicked', () => {
      const result = renderNavPanel();
      result.getByTestId(`groupedNavPanelLink-${SecurityPageName.hosts}`).click();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose callback if outside clicked', () => {
      const result = renderNavPanel();
      result.getByTestId('outsideClickDummy').click();
      waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });
});
