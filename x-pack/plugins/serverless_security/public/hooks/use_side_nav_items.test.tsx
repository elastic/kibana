/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import {
  usePartitionFooterNavItems,
  useSideNavItems,
  useSideNavSelectedId,
} from './use_side_nav_items';
import { BehaviorSubject } from 'rxjs';
import type { NavigationLink } from '@kbn/security-solution-plugin/public/common/links/types';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import { KibanaServicesProvider, servicesMocks } from '../services.mock';

jest.mock('./use_link_props');

const mockNavLinks = jest.fn((): NavigationLink[] => []);
servicesMocks.securitySolution.getNavLinks$.mockImplementation(
  () => new BehaviorSubject(mockNavLinks())
);

const mockUseLocation = jest.fn(() => ({ pathname: '/' }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockUseLocation(),
}));

describe('useSideNavItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty items', async () => {
    const { result } = renderHook(useSideNavItems, { wrapper: KibanaServicesProvider });

    const items = result.current;

    expect(items).toEqual([]);
    expect(servicesMocks.securitySolution.getNavLinks$).toHaveBeenCalledTimes(1);
  });

  it('should return main items', async () => {
    mockNavLinks.mockReturnValueOnce([
      { id: SecurityPageName.alerts, title: 'Alerts' },
      { id: SecurityPageName.case, title: 'Cases' },
    ]);
    const { result } = renderHook(useSideNavItems, { wrapper: KibanaServicesProvider });

    const items = result.current;
    expect(items).toEqual([
      {
        id: SecurityPageName.alerts,
        label: 'Alerts',
        href: expect.any(String),
        onClick: expect.any(Function),
      },
      {
        id: SecurityPageName.case,
        label: 'Cases',
        href: expect.any(String),
        onClick: expect.any(Function),
      },
    ]);
  });

  it('should return secondary items', async () => {
    mockNavLinks.mockReturnValueOnce([
      {
        id: SecurityPageName.dashboards,
        title: 'Dashboards',
        links: [{ id: SecurityPageName.detectionAndResponse, title: 'Detection & Response' }],
      },
    ]);
    const { result } = renderHook(useSideNavItems, { wrapper: KibanaServicesProvider });

    const items = result.current;
    expect(items).toEqual([
      {
        id: SecurityPageName.dashboards,
        label: 'Dashboards',
        href: expect.any(String),
        onClick: expect.any(Function),
        items: [
          {
            id: SecurityPageName.detectionAndResponse,
            label: 'Detection & Response',
            href: expect.any(String),
            onClick: expect.any(Function),
          },
        ],
      },
    ]);
  });

  it('should return get started link', async () => {
    mockNavLinks.mockReturnValueOnce([
      {
        id: SecurityPageName.landing,
        title: 'Get Started',
      },
    ]);
    const { result } = renderHook(useSideNavItems, { wrapper: KibanaServicesProvider });

    const items = result.current;

    expect(items).toEqual([
      {
        id: SecurityPageName.landing,
        label: 'GET STARTED',
        href: expect.any(String),
        onClick: expect.any(Function),
        labelSize: 'xs',
        iconType: 'launch',
        appendSeparator: true,
      },
    ]);
  });
});

describe('usePartitionFooterNavItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should partition main items only', async () => {
    const mainInputItems = [
      {
        id: SecurityPageName.dashboards,
        label: 'Dashboards',
        href: '',
        onClick: jest.fn(),
      },
      {
        id: SecurityPageName.alerts,
        label: 'Alerts',
        href: '',
        onClick: jest.fn(),
      },
    ];
    const { result } = renderHook(usePartitionFooterNavItems, {
      initialProps: mainInputItems,
    });

    const [items, footerItems] = result.current;

    expect(items).toEqual(mainInputItems);
    expect(footerItems).toEqual([]);
  });

  it('should partition footer items only', async () => {
    const footerInputItems = [
      {
        id: SecurityPageName.landing,
        label: 'GET STARTED',
        href: '',
        onClick: jest.fn(),
      },
      {
        id: SecurityPageName.administration,
        label: 'Manage',
        href: '',
        onClick: jest.fn(),
      },
    ];
    const { result } = renderHook(usePartitionFooterNavItems, {
      initialProps: footerInputItems,
    });

    const [items, footerItems] = result.current;

    expect(items).toEqual([]);
    expect(footerItems).toEqual(footerInputItems);
  });

  it('should partition main and footer items', async () => {
    const mainInputItems = [
      {
        id: SecurityPageName.dashboards,
        label: 'Dashboards',
        href: '',
        onClick: jest.fn(),
      },
      {
        id: SecurityPageName.alerts,
        label: 'Alerts',
        href: '',
        onClick: jest.fn(),
      },
    ];
    const footerInputItems = [
      {
        id: SecurityPageName.landing,
        label: 'GET STARTED',
        href: '',
        onClick: jest.fn(),
      },
      {
        id: SecurityPageName.administration,
        label: 'Manage',
        href: '',
        onClick: jest.fn(),
      },
    ];
    const { result } = renderHook(usePartitionFooterNavItems, {
      initialProps: [...mainInputItems, ...footerInputItems],
    });

    const [items, footerItems] = result.current;

    expect(items).toEqual(mainInputItems);
    expect(footerItems).toEqual(footerInputItems);
  });
});

describe('useSideNavSelectedId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty string when no item selected', async () => {
    const items = [
      {
        id: SecurityPageName.dashboards,
        label: 'Dashboards',
        href: '/app/security/dashboards',
        onClick: jest.fn(),
      },
      {
        id: SecurityPageName.alerts,
        label: 'Alerts',
        href: '/app/security/alerts',
        onClick: jest.fn(),
      },
    ];

    const { result } = renderHook(useSideNavSelectedId, {
      wrapper: KibanaServicesProvider,
      initialProps: items,
    });

    const selectedId = result.current;
    expect(selectedId).toEqual('');
  });

  it('should return the item with path selected', async () => {
    mockUseLocation.mockReturnValueOnce({ pathname: '/app/security/alerts' });
    const items = [
      {
        id: SecurityPageName.dashboards,
        label: 'Dashboards',
        href: '/app/security/dashboards',
        onClick: jest.fn(),
      },
      {
        id: SecurityPageName.alerts,
        label: 'Alerts',
        href: '/app/security/alerts',
        onClick: jest.fn(),
      },
    ];

    const { result } = renderHook(useSideNavSelectedId, {
      wrapper: KibanaServicesProvider,
      initialProps: items,
    });

    const selectedId = result.current;
    expect(selectedId).toEqual(SecurityPageName.alerts);
  });

  it('should return the main item when nested path selected', async () => {
    mockUseLocation.mockReturnValueOnce({ pathname: '/app/security/detection_response' });
    const items = [
      {
        id: SecurityPageName.dashboards,
        label: 'Dashboards',
        href: '/app/security/dashboards',
        onClick: jest.fn(),
        items: [
          {
            id: SecurityPageName.detectionAndResponse,
            label: 'Detection & Response',
            href: '/app/security/detection_response',
            onClick: jest.fn(),
          },
        ],
      },
    ];

    const { result } = renderHook(useSideNavSelectedId, {
      wrapper: KibanaServicesProvider,
      initialProps: items,
    });

    const selectedId = result.current;
    expect(selectedId).toEqual(SecurityPageName.dashboards);
  });
});
