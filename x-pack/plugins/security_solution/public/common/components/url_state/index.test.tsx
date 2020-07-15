/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
} from './test_dependencies';
import { UrlStateContainerPropTypes } from './types';
import { useUrlStateHooks } from './use_url_state';
import { wait } from '../../lib/helpers';

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
            mount(<HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />);

            expect(
              mockHistory.replace.mock.calls[mockHistory.replace.mock.calls.length - 1][0]
            ).toEqual({
              hash: '',
              pathname: examplePath,
              search: `?query=(language:kuery,query:'host.name:%22siem-es%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))`,
              state: '',
            });
          }
        );
      });
    });
  });

  describe('After Initialization, keep Relative Date up to date for global only on detections page', () => {
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
        await wait();

        if (CONSTANTS.detectionsPage === page) {
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
        } else {
          // There is no change in url state, so that's expected we only have two actions
          expect(mockSetRelativeRangeDatePicker.mock.calls.length).toEqual(2);
        }
      }
    );
  });
});
