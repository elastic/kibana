/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { HookWrapper } from '../../mock';
import { SecurityPageName } from '../../../app/types';
import { RouteSpyState } from '../../utils/route/types';
import { CONSTANTS } from './constants';
import {
  getMockPropsObj,
  mockHistory,
  mockSetFilterQuery,
  mockSetAbsoluteRangeDatePicker,
  mockSetRelativeRangeDatePicker,
  testCases,
  getMockProps,
} from './test_dependencies';
import { UrlStateContainerPropTypes } from './types';
import { useUrlStateHooks } from './use_url_state';
import { waitFor } from '@testing-library/react';
import { useLocation } from 'react-router-dom';

let mockProps: UrlStateContainerPropTypes;

const mockRouteSpy: RouteSpyState = {
  pageName: SecurityPageName.network,
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/network',
};
jest.mock('../../utils/route/use_route_spy', () => ({
  useRouteSpy: () => [mockRouteSpy],
}));

jest.mock('../super_date_picker', () => ({
  formatDate: (date: string) => {
    return '2020-01-01T00:00:00.000Z';
  },
}));

jest.mock('../../lib/kibana', () => ({
  useKibana: () => ({
    services: {
      data: {
        query: {
          filterManager: {},
          savedQueries: {},
        },
      },
    },
  }),
  KibanaServices: {
    get: jest.fn(() => ({ uiSettings: { get: () => ({ from: 'now-24h', to: 'now' }) } })),
  },
}));

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => jest.fn(),
  };
});

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useLocation: jest.fn(),
  };
});

describe('UrlStateContainer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('handleInitialize', () => {
    describe('URL state updates redux', () => {
      describe('relative timerange actions are called with correct data on component mount', () => {
        test.each(testCases)(
          '%o',
          (page, namespaceLower, namespaceUpper, examplePath, type, pageName, detailName) => {
            mockProps = getMockPropsObj({
              page,
              examplePath,
              namespaceLower,
              pageName,
              detailName,
            }).relativeTimeSearch.undefinedQuery;

            (useLocation as jest.Mock).mockReturnValue({
              pathname: mockProps.pathName,
            });

            mount(<HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />);

            expect(mockSetRelativeRangeDatePicker.mock.calls[1][0]).toEqual({
              from: '2020-01-01T00:00:00.000Z',
              fromStr: 'now-1d/d',
              kind: 'relative',
              to: '2020-01-01T00:00:00.000Z',
              toStr: 'now-1d/d',
              id: 'global',
            });

            expect(mockSetRelativeRangeDatePicker.mock.calls[0][0]).toEqual({
              from: '2020-01-01T00:00:00.000Z',
              fromStr: 'now-15m',
              kind: 'relative',
              to: '2020-01-01T00:00:00.000Z',
              toStr: 'now',
              id: 'timeline',
            });
          }
        );
      });

      describe('absolute timerange actions are called with correct data on component mount', () => {
        test.each(testCases)(
          '%o',
          (page, namespaceLower, namespaceUpper, examplePath, type, pageName, detailName) => {
            mockProps = getMockPropsObj({ page, examplePath, namespaceLower, pageName, detailName })
              .absoluteTimeSearch.undefinedQuery;

            (useLocation as jest.Mock).mockReturnValue({
              pathname: mockProps.pathName,
            });

            mount(<HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />);

            expect(mockSetAbsoluteRangeDatePicker.mock.calls[1][0]).toEqual({
              from: '2019-05-01T18:40:12.685Z',
              kind: 'absolute',
              to: '2019-05-02T18:40:16.082Z',
              id: 'global',
            });

            expect(mockSetAbsoluteRangeDatePicker.mock.calls[0][0]).toEqual({
              from: '2019-05-01T18:40:12.685Z',
              kind: 'absolute',
              to: '2019-05-02T18:40:16.082Z',
              id: 'timeline',
            });
          }
        );
      });

      describe('appQuery action is called with correct data on component mount', () => {
        test.each(testCases.slice(0, 4))(
          ' %o',
          (page, namespaceLower, namespaceUpper, examplePath, type, pageName, detailName) => {
            mockProps = getMockPropsObj({ page, examplePath, namespaceLower, pageName, detailName })
              .relativeTimeSearch.undefinedQuery;

            (useLocation as jest.Mock).mockReturnValue({
              pathname: mockProps.pathName,
            });

            mount(<HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />);

            expect(mockSetFilterQuery.mock.calls[0][0]).toEqual({
              id: 'global',
              language: 'kuery',
              query: 'host.name:"siem-es"',
            });
          }
        );
      });
    });

    describe('Redux updates URL state', () => {
      describe('appQuery url state is set from redux data on component mount', () => {
        test.each(testCases)(
          '%o',
          (page, namespaceLower, namespaceUpper, examplePath, type, pageName, detailName) => {
            mockProps = getMockPropsObj({
              page,
              examplePath,
              namespaceLower,
              pageName,
              detailName,
            }).noSearch.definedQuery;

            (useLocation as jest.Mock).mockReturnValue({
              pathname: mockProps.pathName,
            });

            mount(<HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />);

            expect(
              mockHistory.replace.mock.calls[mockHistory.replace.mock.calls.length - 1][0]
            ).toEqual({
              hash: '',
              pathname: examplePath,
              search: `?query=(language:kuery,query:'host.name:%22siem-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))`,
              state: '',
            });
          }
        );
      });
    });

    it("it doesn't update URL state when pathName and browserPAth are out of sync", () => {
      mockProps = getMockPropsObj({
        page: CONSTANTS.networkPage,
        examplePath: '/network',
        namespaceLower: 'network',
        pageName: SecurityPageName.network,
        detailName: undefined,
      }).noSearch.undefinedQuery;

      (useLocation as jest.Mock).mockReturnValue({
        pathname: 'out of sync path',
      });

      mount(<HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />);

      expect(mockHistory.replace).not.toHaveBeenCalled();
    });

    it('it removes empty AppQuery state from URL', () => {
      mockProps = {
        ...getMockProps(
          {
            hash: '',
            pathname: '/network',
            search: "?query=(query:'')",
            state: '',
          },
          CONSTANTS.networkPage,
          null,
          SecurityPageName.network,
          undefined
        ),
      };

      (useLocation as jest.Mock).mockReturnValue({
        pathname: mockProps.pathName,
      });

      mount(<HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />);

      expect(mockHistory.replace.mock.calls[0][0].search).not.toContain('query=');
    });

    it('it removes empty timeline state from URL', () => {
      mockProps = {
        ...getMockProps(
          {
            hash: '',
            pathname: '/network',
            search: "?timeline=(id:'',isOpen:!t)",
            state: '',
          },
          CONSTANTS.networkPage,
          null,
          SecurityPageName.network,
          undefined
        ),
      };

      (useLocation as jest.Mock).mockReturnValue({
        pathname: mockProps.pathName,
      });

      mount(<HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />);

      expect(mockHistory.replace.mock.calls[0][0].search).not.toContain('timeline=');
    });
  });

  describe('After Initialization, keep Relative Date up to date for global only on alerts page', () => {
    test.each(testCases)(
      '%o',
      async (page, namespaceLower, namespaceUpper, examplePath, type, pageName, detailName) => {
        mockProps = getMockPropsObj({
          page,
          examplePath,
          namespaceLower,
          pageName,
          detailName,
        }).relativeTimeSearch.undefinedQuery;

        (useLocation as jest.Mock).mockReturnValue({
          pathname: mockProps.pathName,
        });

        const wrapper = mount(
          <HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />
        );

        wrapper.setProps({
          hookProps: getMockPropsObj({
            page: CONSTANTS.hostsPage,
            examplePath: '/hosts',
            namespaceLower: 'hosts',
            pageName: SecurityPageName.hosts,
            detailName: undefined,
          }).relativeTimeSearch.undefinedQuery,
        });
        wrapper.update();

        if (CONSTANTS.alertsPage === page) {
          await waitFor(() => {
            expect(mockSetRelativeRangeDatePicker.mock.calls[3][0]).toEqual({
              from: '2020-01-01T00:00:00.000Z',
              fromStr: 'now-1d/d',
              kind: 'relative',
              to: '2020-01-01T00:00:00.000Z',
              toStr: 'now-1d/d',
              id: 'global',
            });

            expect(mockSetRelativeRangeDatePicker.mock.calls[2][0]).toEqual({
              from: 1558732849370,
              fromStr: 'now-15m',
              kind: 'relative',
              to: 1558733749370,
              toStr: 'now',
              id: 'timeline',
            });
          });
        } else {
          await waitFor(() => {
            // There is no change in url state, so that's expected we only have two actions
            expect(mockSetRelativeRangeDatePicker.mock.calls.length).toEqual(2);
          });
        }
      }
    );
  });
});
