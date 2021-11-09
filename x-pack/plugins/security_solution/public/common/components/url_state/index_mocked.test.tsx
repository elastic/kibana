/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { HookWrapper } from '../../mock/hook_wrapper';
import { SecurityPageName } from '../../../app/types';

import { CONSTANTS } from './constants';
import { getFilterQuery, getMockPropsObj, mockHistory, testCases } from './test_dependencies';
import { UrlStateContainerPropTypes } from './types';
import { useUrlStateHooks } from './use_url_state';
import { useLocation } from 'react-router-dom';
import { MANAGEMENT_PATH } from '../../../../common/constants';

let mockProps: UrlStateContainerPropTypes;

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
}));

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => jest.fn(),
  };
});

describe('UrlStateContainer - lodash.throttle mocked to test update url', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('componentDidUpdate', () => {
    test('timerange redux state updates the url', () => {
      mockProps = getMockPropsObj({
        page: CONSTANTS.networkPage,
        examplePath: '/network',
        namespaceLower: 'network',
        pageName: SecurityPageName.network,
        detailName: undefined,
      }).noSearch.definedQuery;

      (useLocation as jest.Mock).mockReturnValue({
        pathname: mockProps.pathName,
      });

      const wrapper = mount(
        <HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />
      );

      const newUrlState = {
        ...mockProps.urlState,
        [CONSTANTS.timerange]: {
          global: {
            [CONSTANTS.timerange]: {
              from: '2020-07-07T08:20:18.966Z',
              fromStr: 'now-24h',
              kind: 'relative',
              to: '2020-07-08T08:20:18.966Z',
              toStr: 'now',
            },
            linkTo: ['timeline'],
          },
          timeline: {
            [CONSTANTS.timerange]: {
              from: '2020-07-07T08:20:18.966Z',
              fromStr: 'now-24h',
              kind: 'relative',
              to: '2020-07-08T08:20:18.966Z',
              toStr: 'now',
            },
            linkTo: ['global'],
          },
        },
      };

      wrapper.setProps({ hookProps: { ...mockProps, urlState: newUrlState } });
      wrapper.update();
      expect(mockHistory.replace.mock.calls[1][0]).toStrictEqual({
        hash: '',
        pathname: '/network',
        search:
          "?query=(language:kuery,query:'host.name:%22siem-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
        state: '',
      });
    });

    test('kql query redux state updates the url', () => {
      mockProps = getMockPropsObj({
        page: CONSTANTS.networkPage,
        examplePath: '/network',
        namespaceLower: 'network',
        pageName: SecurityPageName.network,
        detailName: undefined,
      }).noSearch.undefinedQuery;

      (useLocation as jest.Mock).mockReturnValue({
        pathname: mockProps.pathName,
      });

      const wrapper = mount(
        <HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />
      );
      const newUrlState = {
        ...mockProps.urlState,
        [CONSTANTS.appQuery]: getFilterQuery(),
      };
      wrapper.setProps({
        hookProps: { ...mockProps, urlState: newUrlState, isInitializing: false },
      });
      wrapper.update();

      expect(mockHistory.replace.mock.calls[1][0]).toStrictEqual({
        hash: '',
        pathname: '/network',
        search:
          "?query=(language:kuery,query:'host.name:%22siem-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        state: '',
      });
    });

    test('timelineID redux state updates the url', () => {
      mockProps = getMockPropsObj({
        page: CONSTANTS.networkPage,
        examplePath: '/network',
        namespaceLower: 'network',
        pageName: SecurityPageName.network,
        detailName: undefined,
      }).noSearch.undefinedQuery;

      (useLocation as jest.Mock).mockReturnValue({
        pathname: mockProps.pathName,
      });

      const wrapper = mount(
        <HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />
      );
      const newUrlState = {
        ...mockProps.urlState,
        timeline: { id: 'hello_timeline_id', isOpen: true },
      };

      wrapper.setProps({
        hookProps: { ...mockProps, urlState: newUrlState, isInitializing: false },
      });
      wrapper.update();

      expect(mockHistory.replace.mock.calls[1][0]).toStrictEqual({
        hash: '',
        pathname: '/network',
        search:
          "?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))&timeline=(id:hello_timeline_id,isOpen:!t)",
        state: '',
      });
    });

    test('sourcerer redux state updates the url', () => {
      mockProps = getMockPropsObj({
        page: CONSTANTS.networkPage,
        examplePath: '/network',
        namespaceLower: 'network',
        pageName: SecurityPageName.network,
        detailName: undefined,
      }).noSearch.undefinedQuery;

      (useLocation as jest.Mock).mockReturnValue({
        pathname: mockProps.pathName,
      });

      const wrapper = mount(
        <HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />
      );
      const newUrlState = {
        ...mockProps.urlState,
        sourcerer: ['cool', 'patterns'],
      };

      wrapper.setProps({
        hookProps: { ...mockProps, urlState: newUrlState, isInitializing: false },
      });
      wrapper.update();

      expect(mockHistory.replace.mock.calls[1][0]).toStrictEqual({
        hash: '',
        pathname: '/network',
        search:
          "?sourcerer=!(cool,patterns)&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        state: '',
      });
    });

    test("administration page doesn't has query string", () => {
      mockProps = getMockPropsObj({
        page: CONSTANTS.networkPage,
        examplePath: '/network',
        namespaceLower: 'network',
        pageName: SecurityPageName.network,
        detailName: undefined,
      }).noSearch.definedQuery;

      const urlState = {
        ...mockProps.urlState,
        [CONSTANTS.appQuery]: getFilterQuery(),
        [CONSTANTS.timerange]: {
          global: {
            [CONSTANTS.timerange]: {
              from: '2020-07-07T08:20:18.966Z',
              fromStr: 'now-24h',
              kind: 'relative',
              to: '2020-07-08T08:20:18.966Z',
              toStr: 'now',
            },
            linkTo: ['timeline'],
          },
          timeline: {
            [CONSTANTS.timerange]: {
              from: '2020-07-07T08:20:18.966Z',
              fromStr: 'now-24h',
              kind: 'relative',
              to: '2020-07-08T08:20:18.966Z',
              toStr: 'now',
            },
            linkTo: ['global'],
          },
        },
      };

      const updatedMockProps = {
        ...getMockPropsObj({
          ...mockProps,
          page: CONSTANTS.unknown,
          examplePath: MANAGEMENT_PATH,
          namespaceLower: 'administration',
          pageName: SecurityPageName.administration,
          detailName: undefined,
        }).noSearch.definedQuery,
        urlState,
      };

      (useLocation as jest.Mock).mockReturnValue({
        pathname: mockProps.pathName,
      });

      const wrapper = mount(
        <HookWrapper
          hookProps={{ ...mockProps, urlState }}
          hook={(args) => useUrlStateHooks(args)}
        />
      );

      (useLocation as jest.Mock).mockReturnValue({
        pathname: updatedMockProps.pathName,
      });

      wrapper.setProps({
        hookProps: updatedMockProps,
      });

      wrapper.update();
      expect(mockHistory.replace.mock.calls[1][0]).toStrictEqual({
        hash: '',
        pathname: MANAGEMENT_PATH,
        search: '?',
        state: '',
      });
    });
  });

  describe('handleInitialize', () => {
    describe('Redux updates URL state', () => {
      describe('Timerange url state is set when not defined on component mount', () => {
        test.each(testCases)(
          '%o',
          (page, namespaceLower, namespaceUpper, examplePath, type, pageName, detailName) => {
            mockProps = getMockPropsObj({ page, examplePath, namespaceLower, pageName, detailName })
              .noSearch.undefinedQuery;

            (useLocation as jest.Mock).mockReturnValue({
              pathname: mockProps.pathName,
            });

            mount(<HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />);

            expect(mockHistory.replace.mock.calls[0][0]).toEqual({
              hash: '',
              pathname: examplePath,
              search:
                "?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
              state: '',
            });
          }
        );

        test('url state is set from redux data when location updates and initialization', () => {
          mockProps = getMockPropsObj({
            page: CONSTANTS.hostsPage,
            examplePath: '/hosts',
            namespaceLower: 'hosts',
            pageName: SecurityPageName.hosts,
            detailName: undefined,
          }).noSearch.undefinedQuery;
          const updatedProps = getMockPropsObj({
            page: CONSTANTS.networkPage,
            examplePath: '/network',
            namespaceLower: 'network',
            pageName: SecurityPageName.network,
            detailName: undefined,
          }).noSearch.definedQuery;

          (useLocation as jest.Mock).mockReturnValue({
            pathname: mockProps.pathName,
          });

          const wrapper = mount(
            <HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />
          );

          expect(mockHistory.replace.mock.calls[0][0].search).toEqual(
            "?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))"
          );

          (useLocation as jest.Mock).mockReturnValue({
            pathname: updatedProps.pathName,
          });

          wrapper.setProps({ hookProps: updatedProps });

          wrapper.update();

          expect(mockHistory.replace.mock.calls[1][0].search).toEqual(
            "?query=(language:kuery,query:'host.name:%22siem-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))"
          );
        });

        test("doesn't update url state on administration page", () => {
          mockProps = getMockPropsObj({
            page: CONSTANTS.hostsPage,
            examplePath: '/hosts',
            namespaceLower: 'hosts',
            pageName: SecurityPageName.hosts,
            detailName: undefined,
          }).noSearch.undefinedQuery;

          const updatedMockProps = {
            ...getMockPropsObj({
              ...mockProps,
              page: CONSTANTS.unknown,
              examplePath: MANAGEMENT_PATH,
              namespaceLower: 'administration',
              pageName: SecurityPageName.administration,
              detailName: undefined,
            }).noSearch.definedQuery,
          };

          (useLocation as jest.Mock).mockReturnValue({
            pathname: mockProps.pathName,
          });

          const wrapper = mount(
            <HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />
          );

          expect(mockHistory.replace.mock.calls[0][0].search).toEqual(
            "?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))"
          );

          (useLocation as jest.Mock).mockReturnValue({
            pathname: updatedMockProps.pathName,
          });

          wrapper.setProps({ hookProps: updatedMockProps });

          wrapper.update();

          expect(mockHistory.replace.mock.calls[1][0].search).toEqual('?');
        });
      });
    });
  });
});
