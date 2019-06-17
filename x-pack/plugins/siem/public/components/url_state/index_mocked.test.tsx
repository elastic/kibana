/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { throttle } from 'lodash/fp';
import * as React from 'react';
import { UrlStateContainerLifecycle } from './';
import { getMockPropsObj, mockHistory, filterQuery, testCases } from './test_dependencies';
import { hostsModel, networkModel } from '../../store';
import { UrlStateContainerPropTypes } from './types';
import { CONSTANTS } from './constants';

jest.mock('lodash/fp');

let mockProps: UrlStateContainerPropTypes;

describe('UrlStateContainer - lodash.throttle mocked to test update url', () => {
  beforeEach(() => {
    // @ts-ignore property mockImplementation does not exists
    throttle.mockImplementation((time, faker) => faker);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('componentDidUpdate', () => {
    test('timerange redux state updates the url', () => {
      mockProps = getMockPropsObj({
        page: CONSTANTS.networkPage,
        examplePath: '/network',
        namespaceLower: 'network',
        type: networkModel.NetworkType.page,
      }).noSearch.definedQuery;
      const wrapper = shallow(<UrlStateContainerLifecycle {...mockProps} />);

      const newUrlState = {
        ...mockProps.urlState,
        [CONSTANTS.timerange]: {
          global: {
            [CONSTANTS.timerange]: {
              from: 0,
              fromStr: 'now-24h',
              kind: 'relative',
              to: 1,
              toStr: 'now',
            },
            linkTo: ['timeline'],
          },
          timeline: {
            [CONSTANTS.timerange]: {
              from: 0,
              fromStr: 'now-24h',
              kind: 'relative',
              to: 1,
              toStr: 'now',
            },
            linkTo: ['global'],
          },
        },
      };

      wrapper.setProps({ urlState: newUrlState });
      wrapper.update();
      expect(mockHistory.replace.mock.calls[2][0]).toStrictEqual({
        hash: '',
        pathname: '/network',
        search:
          '?_g=()&timerange=(global:(linkTo:!(timeline),timerange:(from:0,fromStr:now-24h,kind:relative,to:1,toStr:now)),timeline:(linkTo:!(global),timerange:(from:0,fromStr:now-24h,kind:relative,to:1,toStr:now)))',
        state: '',
      });
    });
    test('kql query redux state updates the url', () => {
      mockProps = getMockPropsObj({
        page: CONSTANTS.networkPage,
        examplePath: '/network',
        namespaceLower: 'network',
        type: networkModel.NetworkType.page,
      }).noSearch.definedQuery;
      const wrapper = shallow(<UrlStateContainerLifecycle {...mockProps} />);

      const newUrlState = {
        [CONSTANTS.kqlQuery]: {
          [CONSTANTS.networkPage]: {
            filterQuery,
            type: networkModel.NetworkType.page,
            queryLocation: CONSTANTS.networkPage,
          },
        },
      };

      wrapper.setProps({ urlState: newUrlState });
      wrapper.update();

      expect(mockHistory.replace.mock.calls[0][0]).toStrictEqual({
        hash: '',
        pathname: '/network',
        search:
          "?_g=()&kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:network.page,type:page)",
        state: '',
      });
    });
  });

  describe('handleInitialize', () => {
    describe('Redux updates URL state', () => {
      describe('kqlQuery and timerange url state is set when not defined on component mount', () => {
        test.each(testCases)('%o', (page, namespaceLower, namespaceUpper, examplePath, type) => {
          mockProps = getMockPropsObj({ page, examplePath, namespaceLower, type }).noSearch
            .undefinedQuery;
          shallow(<UrlStateContainerLifecycle {...mockProps} />);

          expect(mockHistory.replace.mock.calls[0][0]).toEqual({
            hash: '',
            pathname: examplePath,
            search: `?_g=()&kqlQuery=(filterQuery:!n,queryLocation:${page},type:${type})`,
            state: '',
          });

          expect(mockHistory.replace.mock.calls[1][0]).toEqual({
            hash: '',
            pathname: examplePath,
            search:
              '?_g=()&timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
            state: '',
          });
        });
      });

      test('url state is set from redux data when location updates', () => {
        mockProps = getMockPropsObj({
          page: CONSTANTS.hostsPage,
          examplePath: '/hosts',
          namespaceLower: 'hosts',
          type: hostsModel.HostsType.page,
        }).noSearch.undefinedQuery;
        const updatedProps = getMockPropsObj({
          page: CONSTANTS.networkPage,
          examplePath: '/network',
          namespaceLower: 'network',
          type: networkModel.NetworkType.page,
        }).noSearch.undefinedQuery;
        const wrapper = shallow(<UrlStateContainerLifecycle {...mockProps} />);

        // @ts-ignore ignore staticContext warning
        wrapper.setProps(updatedProps);
        wrapper.update();
        // sets new kqlQuery
        expect(mockHistory.replace.mock.calls[2][0]).toEqual({
          hash: '',
          pathname: '/network',
          search: `?_g=()&kqlQuery=(filterQuery:!n,queryLocation:${CONSTANTS.networkPage},type:${
            networkModel.NetworkType.page
          })`,
          state: '',
        });
        // sets same timeline
        expect(mockHistory.replace.mock.calls[3][0].search).toEqual(
          mockHistory.replace.mock.calls[1][0].search
        );
      });
    });
  });
});
