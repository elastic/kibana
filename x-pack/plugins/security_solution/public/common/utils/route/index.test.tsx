/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { HostsTableType } from '../../../explore/hosts/store/model';
import { ManageRoutesSpy } from './manage_spy_routes';
import { SpyRouteComponent } from './spy_routes';
import { useRouteSpy } from './use_route_spy';
import { generateHistoryMock, generateRoutesMock } from './mocks';
import { SecurityPageName } from '../../../app/types';

const mockUseRouteSpy: jest.Mock = useRouteSpy as jest.Mock;
jest.mock('./use_route_spy', () => ({
  useRouteSpy: jest.fn(),
}));

describe('Spy Routes', () => {
  let mockRoutes: ReturnType<typeof generateRoutesMock>;
  let mockHistoryValue: ReturnType<typeof generateHistoryMock>;
  let dispatchMock: jest.Mock;

  beforeEach(() => {
    mockRoutes = generateRoutesMock();
    mockHistoryValue = generateHistoryMock();
    dispatchMock = jest.fn();
    mockUseRouteSpy.mockImplementation(() => [mockRoutes, dispatchMock]);
  });

  describe('At Initialization of the app', () => {
    test('Make sure we update search state first', async () => {
      const pathname = '/';
      mount(
        <ManageRoutesSpy>
          <SpyRouteComponent
            location={{ hash: '', pathname, search: '?importantQueryString="really"', state: '' }}
            history={mockHistoryValue}
            match={{
              isExact: false,
              path: pathname,
              url: pathname,
              params: {
                detailName: '',
                tabName: HostsTableType.hosts,
                search: '',
                flowTarget: undefined,
              },
            }}
            pageName={undefined}
          />
        </ManageRoutesSpy>
      );

      expect(dispatchMock.mock.calls[0]).toEqual([
        {
          type: 'updateSearch',
          search: '?importantQueryString="really"',
        },
      ]);
    });

    test('Make sure we update search state first and then update the route but keeping the initial search', () => {
      const pathname = '/hosts/allHosts';
      mount(
        <ManageRoutesSpy>
          <SpyRouteComponent
            location={{ hash: '', pathname, search: '?importantQueryString="really"', state: '' }}
            history={mockHistoryValue}
            match={{
              isExact: false,
              path: pathname,
              url: pathname,
              params: {
                detailName: undefined,
                tabName: HostsTableType.hosts,
                search: '?IdoNotWantToSeeYou="true"',
                flowTarget: undefined,
              },
            }}
            pageName={SecurityPageName.hosts}
          />
        </ManageRoutesSpy>
      );

      expect(dispatchMock.mock.calls[0]).toEqual([
        {
          type: 'updateSearch',
          search: '?importantQueryString="really"',
        },
      ]);

      expect(dispatchMock.mock.calls[1]).toEqual([
        {
          route: {
            pageName: 'hosts',
            detailName: undefined,
            history: mockHistoryValue,
            pathName: pathname,
            tabName: HostsTableType.hosts,
          },
          type: 'updateRouteWithOutSearch',
        },
      ]);
    });
  });

  describe('When app is running', () => {
    test('Update route should be updated when there is changed detected', () => {
      const pathname = '/hosts/allHosts';
      const newPathname = `hosts/${HostsTableType.authentications}`;
      const wrapper = mount(
        <SpyRouteComponent
          location={{ hash: '', pathname, search: '?importantQueryString="really"', state: '' }}
          history={mockHistoryValue}
          match={{
            isExact: false,
            path: pathname,
            url: pathname,
            params: {
              detailName: undefined,
              tabName: HostsTableType.hosts,
              search: '?IdoNotWantToSeeYou="true"',
              flowTarget: undefined,
            },
          }}
          pageName={SecurityPageName.hosts}
        />
      );

      dispatchMock.mockReset();
      dispatchMock.mockClear();

      wrapper.setProps({
        location: {
          hash: '',
          pathname: newPathname,
          search: '?updated="true"',
          state: '',
        },
        match: {
          isExact: false,
          path: newPathname,
          url: newPathname,
          params: {
            pageName: SecurityPageName.hosts,
            detailName: undefined,
            tabName: HostsTableType.authentications,
            search: '',
          },
        },
      });
      wrapper.update();
      expect(dispatchMock.mock.calls[0]).toEqual([
        { type: 'updateSearch', search: '?updated="true"' },
      ]);
      expect(dispatchMock.mock.calls[1]).toEqual([
        {
          route: {
            detailName: undefined,
            history: mockHistoryValue,
            pageName: SecurityPageName.hosts,
            pathName: newPathname,
            tabName: HostsTableType.authentications,
            search: '?updated="true"',
          },
          type: 'updateRoute',
        },
      ]);
    });
  });
});
