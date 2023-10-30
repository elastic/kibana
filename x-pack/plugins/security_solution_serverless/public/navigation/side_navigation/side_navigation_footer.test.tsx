/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { SideNavigationFooter } from './side_navigation_footer';
import { ExternalPageName } from '../links/constants';
import { I18nProvider } from '@kbn/i18n-react';
import type { ProjectSideNavItem } from './types';
import { FOOTER_CATEGORIES } from '../categories';

jest.mock('../../common/services');

const items: ProjectSideNavItem[] = [
  {
    id: SecurityPageName.landing,
    label: 'Get Started',
    href: '/landing',
  },
  {
    id: ExternalPageName.devTools,
    label: 'Developer tools',
    href: '/dev_tools',
  },
  {
    id: ExternalPageName.management,
    label: 'Management',
    href: '/management',
  },
  {
    id: ExternalPageName.integrationsSecurity,
    label: 'Integrations',
    href: '/integrations',
  },
  {
    id: ExternalPageName.cloudUsersAndRoles,
    label: 'Users and roles',
    href: '/cloud/users_and_roles',
  },
  {
    id: ExternalPageName.cloudBilling,
    label: 'Billing and subscription',
    href: '/cloud/billing',
  },
];

describe('SideNavigationFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all the items', () => {
    const component = render(
      <SideNavigationFooter items={items} activeNodeId={''} categories={FOOTER_CATEGORIES} />,
      {
        wrapper: I18nProvider,
      }
    );

    items.forEach((item) => {
      expect(component.queryByTestId(`solutionSideNavItemLink-${item.id}`)).toBeInTheDocument();
    });
  });

  it('should highlight the active node', () => {
    const component = render(
      <SideNavigationFooter
        items={items}
        activeNodeId={'dev_tools'}
        categories={FOOTER_CATEGORIES}
      />,
      {
        wrapper: I18nProvider,
      }
    );

    items.forEach((item) => {
      const isSelected = component
        .queryByTestId(`solutionSideNavItemLink-${item.id}`)
        ?.className.includes('isSelected');

      if (item.id === ExternalPageName.devTools) {
        expect(isSelected).toBe(true);
      } else {
        expect(isSelected).toBe(false);
      }
    });
  });

  it('should highlight the active node inside the collapsible', () => {
    const component = render(
      <SideNavigationFooter
        items={items}
        activeNodeId={'management'}
        categories={FOOTER_CATEGORIES}
      />,
      {
        wrapper: I18nProvider,
      }
    );

    items.forEach((item) => {
      const isSelected = component
        .queryByTestId(`solutionSideNavItemLink-${item.id}`)
        ?.className.includes('isSelected');

      if (item.id === ExternalPageName.management) {
        expect(isSelected).toBe(true);
      } else {
        expect(isSelected).toBe(false);
      }
    });
  });

  it('should render closed collapsible if it has no active node', () => {
    const component = render(
      <SideNavigationFooter items={items} activeNodeId={''} categories={FOOTER_CATEGORIES} />,
      {
        wrapper: I18nProvider,
      }
    );

    const isOpen = component
      .queryByTestId('navFooterCollapsible-project-settings')
      ?.className.includes('euiAccordion-isOpen');

    expect(isOpen).toBe(false);
  });

  it('should open collapsible if it has an active node', () => {
    const component = render(
      <SideNavigationFooter
        items={items}
        activeNodeId={'management'}
        categories={FOOTER_CATEGORIES}
      />,
      {
        wrapper: I18nProvider,
      }
    );

    const isOpen = component
      .queryByTestId('navFooterCollapsible-project-settings')
      ?.className.includes('euiAccordion-isOpen');

    expect(isOpen).toBe(true);
  });
});
