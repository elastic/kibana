/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useSideNavItems } from './use_side_nav_items';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { mockServices, mockProjectNavLinks } from '../../common/services/__mocks__/services.mock';
import { ExternalPageName } from '../links/constants';

jest.mock('@kbn/security-solution-navigation/src/navigation');
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
        onClick: expect.any(Function),
      },
      {
        id: SecurityPageName.case,
        label: 'Cases',
        position: 'top',
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
        onClick: expect.any(Function),
        items: [
          {
            id: SecurityPageName.detectionAndResponse,
            label: 'Detection & Response',
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
        onClick: expect.any(Function),
        iconType: 'launch',
        appendSeparator: true,
      },
    ]);
  });

  it('should openInNewTab for external (cloud) links', async () => {
    mockProjectNavLinks.mockReturnValueOnce([
      {
        id: ExternalPageName.cloudUsersAndRoles,
        externalUrl: 'https://cloud.elastic.co/users_roles',
        title: 'Users & Roles',
        sideNavIcon: 'someicon',
      },
    ]);
    const { result } = renderHook(useSideNavItems);

    const items = result.current;

    expect(items).toEqual([
      {
        id: ExternalPageName.cloudUsersAndRoles,
        href: 'https://cloud.elastic.co/users_roles',
        label: 'Users & Roles',
        openInNewTab: true,
        iconType: 'someicon',
        position: 'top',
      },
    ]);
  });
});
