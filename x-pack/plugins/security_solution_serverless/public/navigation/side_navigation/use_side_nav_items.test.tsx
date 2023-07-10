/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useSideNavItems, useSideNavSelectedId } from './use_side_nav_items';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import { mockServices, mockProjectNavLinks } from '../../common/__mocks__/services.mock';

jest.mock('../../common/hooks/use_link_props');
jest.mock('../../common/services');

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
    const { result } = renderHook(useSideNavItems);
    const items = result.current;

    expect(items).toEqual([]);
    expect(mockServices.getProjectNavLinks$).toHaveBeenCalledTimes(1);
  });

  it('should return main items', async () => {
    mockProjectNavLinks.mockReturnValueOnce([
      { id: SecurityPageName.alerts, title: 'Alerts' },
      { id: SecurityPageName.case, title: 'Cases' },
    ]);
    const { result } = renderHook(useSideNavItems);

    const items = result.current;
    expect(items).toEqual([
      {
        id: SecurityPageName.alerts,
        label: 'Alerts',
        position: 'top',
        href: expect.any(String),
        onClick: expect.any(Function),
      },
      {
        id: SecurityPageName.case,
        label: 'Cases',
        position: 'top',
        href: expect.any(String),
        onClick: expect.any(Function),
      },
    ]);
  });

  it('should return secondary items', async () => {
    mockProjectNavLinks.mockReturnValueOnce([
      {
        id: SecurityPageName.dashboards,
        title: 'Dashboards',
        links: [{ id: SecurityPageName.detectionAndResponse, title: 'Detection & Response' }],
      },
    ]);
    const { result } = renderHook(useSideNavItems);

    const items = result.current;
    expect(items).toEqual([
      {
        id: SecurityPageName.dashboards,
        label: 'Dashboards',
        position: 'top',
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
    mockProjectNavLinks.mockReturnValueOnce([
      {
        id: SecurityPageName.landing,
        title: 'Get Started',
        sideNavIcon: 'launch',
      },
    ]);
    const { result } = renderHook(useSideNavItems);

    const items = result.current;

    expect(items).toEqual([
      {
        id: SecurityPageName.landing,
        label: 'Get Started',
        position: 'bottom',
        href: expect.any(String),
        onClick: expect.any(Function),
        iconType: 'launch',
        appendSeparator: true,
      },
    ]);
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

    const { result } = renderHook(useSideNavSelectedId, { initialProps: items });

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

    const { result } = renderHook(useSideNavSelectedId, { initialProps: items });

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

    const { result } = renderHook(useSideNavSelectedId, { initialProps: items });

    const selectedId = result.current;
    expect(selectedId).toEqual(SecurityPageName.dashboards);
  });
});
