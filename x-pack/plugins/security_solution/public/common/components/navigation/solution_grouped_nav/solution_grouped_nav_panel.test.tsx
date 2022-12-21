/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LinkCategories } from '../../../links';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { SecurityPageName } from '../../../../app/types';
import { TestProviders } from '../../../mock';
import type { SolutionNavPanelProps } from './solution_grouped_nav_panel';
import { SolutionNavPanel } from './solution_grouped_nav_panel';
import type { DefaultSideNavItem } from './types';
import { bottomNavOffset } from '../../../lib/helpers';
import { BETA } from '@kbn/kubernetes-security-plugin/common/translations';

const mockUseIsWithinMinBreakpoint = jest.fn(() => true);
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useIsWithinMinBreakpoint: () => mockUseIsWithinMinBreakpoint(),
  };
});

const mockItems: DefaultSideNavItem[] = [
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
  {
    id: SecurityPageName.kubernetes,
    label: 'Kubernetes',
    href: '/kubernetes',
    description: 'Kubernetes description',
    isBeta: true,
  },
];

const betaMockItemsCount = mockItems.filter((item) => item.isBeta).length;

const mockCategories: LinkCategories = [
  {
    label: 'HOSTS CATEGORY',
    linkIds: [SecurityPageName.hosts],
  },
  {
    label: 'Empty category',
    linkIds: [],
  },
];

const PANEL_TITLE = 'test title';
const mockOnClose = jest.fn();
const mockOnOutsideClick = jest.fn();
const renderNavPanel = (props: Partial<SolutionNavPanelProps> = {}) =>
  render(
    <>
      <div data-test-subj="outsideClickDummy" />
      <SolutionNavPanel
        items={mockItems}
        title={PANEL_TITLE}
        onClose={mockOnClose}
        onOutsideClick={mockOnOutsideClick}
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
    expect(result.queryAllByText(BETA).length).toBe(betaMockItemsCount);
  });

  it('should only render categories with items', () => {
    const result = renderNavPanel({ categories: mockCategories });

    mockCategories.forEach((mockCategory) => {
      if (mockCategory.linkIds.length) {
        expect(result.getByText(mockCategory.label)).toBeInTheDocument();
      } else {
        expect(result.queryByText(mockCategory.label)).not.toBeInTheDocument();
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

  describe('bottom offset', () => {
    it('should add bottom offset', () => {
      mockUseIsWithinMinBreakpoint.mockReturnValueOnce(true);
      const result = renderNavPanel({ bottomOffset: bottomNavOffset });

      expect(result.getByTestId('groupedNavPanel')).toHaveStyle({ bottom: bottomNavOffset });
    });

    it('should not add bottom offset if not large screen', () => {
      mockUseIsWithinMinBreakpoint.mockReturnValueOnce(false);
      const result = renderNavPanel({ bottomOffset: bottomNavOffset });

      expect(result.getByTestId('groupedNavPanel')).not.toHaveStyle({ bottom: bottomNavOffset });
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
        expect(mockOnOutsideClick).toHaveBeenCalled();
      });
    });
  });
});
