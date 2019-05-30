/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { Router } from 'react-router-dom';
import { MockedProvider } from 'react-apollo/test-utils';

import {
  isKqlForRoute,
  UrlStateContainer,
  UrlStateContainerLifecycle,
  UrlStateContainerLifecycleProps,
} from './';
import { apolloClientObservable, mockGlobalState, TestProviders } from '../../mock';
import {
  createStore,
  hostsModel,
  networkModel,
  State,
  KueryFilterQuery,
  SerializedFilterQuery,
  KueryFilterModel,
} from '../../store';
import { ActionCreator } from 'typescript-fsa';
import { InputsModelId } from '../../store/inputs/model';
import { wait } from '../../lib/helpers';

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';
const location = {
  pathname: '/network',
  search: '',
  state: '',
  hash: '',
};
const mockHistory = {
  length: 2,
  location,
  action: pop,
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  block: jest.fn(),
  createHref: jest.fn(),
  listen: jest.fn(),
};

const filterQuery: KueryFilterQuery = {
  expression: 'host.name:"siem-es"',
  kind: 'kuery',
};

const mockProps: UrlStateContainerLifecycleProps = {
  history: mockHistory,
  location,
  indexPattern: {
    fields: [
      {
        name: '@timestamp',
        searchable: true,
        type: 'date',
        aggregatable: true,
      },
    ],
    title: 'filebeat-*,packetbeat-*',
  },
  urlState: {
    timerange: {
      global: {
        kind: 'relative',
        fromStr: 'now-24h',
        toStr: 'now',
        from: 1558048243696,
        to: 1558134643697,
        linkTo: ['timeline'],
      },
      timeline: {
        kind: 'relative',
        fromStr: 'now-24h',
        toStr: 'now',
        from: 1558048243696,
        to: 1558134643697,
        linkTo: ['global'],
      },
    },
    kqlQuery: [
      {
        filterQuery,
        type: networkModel.NetworkType.page,
        model: KueryFilterModel.network,
      },
    ],
  },
  setAbsoluteTimerange: (jest.fn() as unknown) as ActionCreator<{
    from: number;
    fromStr: undefined;
    id: InputsModelId;
    to: number;
    toStr: undefined;
  }>,
  setHostsKql: (jest.fn() as unknown) as ActionCreator<{
    filterQuery: SerializedFilterQuery;
    hostsType: hostsModel.HostsType;
  }>,
  setNetworkKql: (jest.fn() as unknown) as ActionCreator<{
    filterQuery: SerializedFilterQuery;
    networkType: networkModel.NetworkType;
  }>,
  setRelativeTimerange: (jest.fn() as unknown) as ActionCreator<{
    from: number;
    fromStr: string;
    id: InputsModelId;
    to: number;
    toStr: string;
  }>,
  toggleTimelineLinkTo: (jest.fn() as unknown) as ActionCreator<{
    linkToId: InputsModelId;
  }>,
};

describe('UrlStateComponents', () => {
  describe('UrlStateContainer', () => {
    const state: State = mockGlobalState;

    let store = createStore(state, apolloClientObservable);

    beforeEach(() => {
      store = createStore(state, apolloClientObservable);
    });
    afterEach(() => {
      jest.clearAllMocks();
    });
    test('mounts and renders', () => {
      const wrapper = mount(
        <MockedProvider>
          <TestProviders store={store}>
            <Router history={mockHistory}>
              <UrlStateContainer />
            </Router>
          </TestProviders>
        </MockedProvider>
      );
      const urlStateComponents = wrapper.find('[data-test-subj="urlStateComponents"]');
      urlStateComponents.exists();
      expect(toJson(wrapper)).toMatchSnapshot();
    });
    test('componentDidUpdate - timerange redux state updates the url', async () => {
      const wrapper = shallow(<UrlStateContainerLifecycle {...mockProps} />);

      const newUrlState = {
        timerange: {
          timeline: {
            kind: 'relative',
            fromStr: 'now-24h',
            toStr: 'now',
            from: 1558048243696,
            to: 1558134643697,
            linkTo: ['global'],
          },
        },
      };

      wrapper.setProps({ urlState: newUrlState });
      wrapper.update();
      await wait(2000); // double throttle wait time for latency issues in jenkins
      expect(mockHistory.replace.mock.calls[1][0]).toStrictEqual({
        hash: '',
        pathname: '/network',
        search:
          '?timerange=(global:(linkTo:!(timeline),timerange:(from:0,fromStr:now-24h,kind:relative,to:1,toStr:now)),timeline:(linkTo:(from:0,fromStr:now-24h,kind:relative,to:1,toStr:now),timerange:!(global)))',
        state: '',
      });
    });
    test('componentDidUpdate - kql query redux state updates the url', async () => {
      const wrapper = shallow(<UrlStateContainerLifecycle {...mockProps} />);

      const newUrlState = {
        kqlQuery: [
          {
            filterQuery,
            type: networkModel.NetworkType.details,
            model: KueryFilterModel.network,
          },
        ],
      };

      wrapper.setProps({ urlState: newUrlState });
      wrapper.update();
      await wait(2000); // double throttle wait time for latency issues with this test
      expect(mockHistory.replace.mock.calls[1][0]).toStrictEqual({
        hash: '',
        pathname: '/network',
        search:
          "?kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),model:network,type:details)",
        state: '',
      });
    });
  });

  describe('handleInitialize', () => {
    // silly that this needs to be an array and not an object
    // https://jestjs.io/docs/en/api#testeachtable-name-fn-timeout
    const testCases = [
      [
        /* page */ CONSTANTS.networkPage,
        /* namespaceLower */ 'network',
        /* namespaceUpper */ 'Network',
        /* examplePath */ '/network',
        /* type */ networkModel.NetworkType.page,
      ],
      [
        /* page */ CONSTANTS.hostsPage,
        /* namespaceLower */ 'hosts',
        /* namespaceUpper */ 'Hosts',
        /* examplePath */ '/hosts',
        /* type */ hostsModel.HostsType.page,
      ],
      [
        /* page */ CONSTANTS.hostsDetails,
        /* namespaceLower */ 'hosts',
        /* namespaceUpper */ 'Hosts',
        /* examplePath */ '/hosts/siem-es',
        /* type */ hostsModel.HostsType.details,
      ],
      [
        /* page */ CONSTANTS.networkDetails,
        /* namespaceLower */ 'network',
        /* namespaceUpper */ 'Network',
        /* examplePath */ '/network/ip/100.90.80',
        /* type */ networkModel.NetworkType.details,
      ],
    ];
    afterEach(() => {
      jest.resetAllMocks();
    });
    describe('URL state updates redux', () => {
      describe('relative timerange actions are called with correct data on component mount', () => {
        test.each(testCases)('%o', (page, namespaceLower, namespaceUpper, examplePath, type) => {
          mockProps = getMockPropsObj({ page, examplePath, namespaceLower, type })
            .relativeTimeSearch.undefinedQuery;
          shallow(<UrlStateContainerLifecycle {...mockProps} />);
          // @ts-ignore property mock does not exists
          expect(defaultProps.setRelativeTimerange.mock.calls[0][0]).toEqual({
            from: 1558591200000,
            fromStr: 'now-1d/d',
            kind: 'relative',
            to: 1558677599999,
            toStr: 'now-1d/d',
            id: 'global',
          });
          // @ts-ignore property mock does not exists
          expect(defaultProps.setRelativeTimerange.mock.calls[1][0]).toEqual({
            from: 1558732849370,
            fromStr: 'now-15m',
            kind: 'relative',
            to: 1558733749370,
            toStr: 'now',
            id: 'timeline',
          });
        });
      });
      describe('absolute timerange actions are called with correct data on component mount', () => {
        test.each(testCases)('%o', (page, namespaceLower, namespaceUpper, examplePath, type) => {
          mockProps = getMockPropsObj({ page, examplePath, namespaceLower, type })
            .absoluteTimeSearch.undefinedQuery;
          shallow(<UrlStateContainerLifecycle {...mockProps} />);
          // @ts-ignore property mock does not exists
          expect(defaultProps.setAbsoluteTimerange.mock.calls[0][0]).toEqual({
            from: 1556736012685,
            kind: 'absolute',
            to: 1556822416082,
            id: 'global',
          });
          // @ts-ignore property mock does not exists
          expect(defaultProps.setAbsoluteTimerange.mock.calls[1][0]).toEqual({
            from: 1556736012685,
            kind: 'absolute',
            to: 1556822416082,
            id: 'timeline',
          });
        });
      });
      describe('kqlQuery action is called with correct data on component mount', () => {
        test.each(testCases)(' %o', (page, namespaceLower, namespaceUpper, examplePath, type) => {
          mockProps = getMockPropsObj({ page, examplePath, namespaceLower, type })
            .relativeTimeSearch.undefinedQuery;
          shallow(<UrlStateContainerLifecycle {...mockProps} />);
          const functionName =
            namespaceUpper === 'Network' ? defaultProps.setNetworkKql : defaultProps.setHostsKql;
          // @ts-ignore property mock does not exists
          expect(functionName.mock.calls[0][0]).toEqual({
            filterQuery: serializedFilterQuery,
            [`${namespaceLower}Type`]: type,
          });
        });
      });
      describe('kqlQuery action is not called called when the queryLocation does not match the router location', () => {
        test.each(testCases)(
          '%o',
          async (page, namespaceLower, namespaceUpper, examplePath, type) => {
            mockProps = getMockPropsObj({ page, examplePath, namespaceLower, type })
              .oppositeQueryLocationSearch.undefinedQuery;
            shallow(<UrlStateContainerLifecycle {...mockProps} />);
            // @ts-ignore property mock does not exists
            expect(defaultProps[`set${namespaceUpper}Kql`].mock.calls.length).toEqual(0);
          }
        );
      });
    });

    describe('Redux updates URL state', () => {
      afterEach(() => {
        jest.resetAllMocks();
      });
      describe('kqlQuery url state is set from redux data on component mount', () => {
        afterEach(() => {
          jest.resetAllMocks();
        });
        test.each(testCases)(
          '%o',
          async (page, namespaceLower, namespaceUpper, examplePath, type) => {
            mockProps = getMockPropsObj({ page, examplePath, namespaceLower, type }).noSearch
              .definedQuery;
            shallow(<UrlStateContainerLifecycle {...mockProps} />);

            // @ts-ignore property mock does not exists
            expect(mockHistory.replace.mock.calls[0][0]).toEqual({
              hash: '',
              pathname: examplePath,
              search: `?_g=()&kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:${page},type:${type})`,
              state: '',
            });
          }
        );
      });

      describe('kqlQuery and timerange url state is set when not defined on component mount', () => {
        afterEach(() => {
          jest.resetAllMocks();
        });
        test.each(testCases)(
          '%o',
          async (page, namespaceLower, namespaceUpper, examplePath, type) => {
            const forSureResetProps = {
              ...getMockPropsObj({ page, examplePath, namespaceLower, type }).noSearch
                .undefinedQuery,
              history: {
                ...mockHistory,
                replace: jest.fn(),
              },
            };
            shallow(<UrlStateContainerLifecycle {...forSureResetProps} />);
            await wait(2000); // double throttle wait time for latency issues in jenkins

            // @ts-ignore property mock does not exists
            expect(forSureResetProps.history.replace.mock.calls[0][0]).toEqual({
              hash: '',
              pathname: examplePath,
              search: `?_g=()&kqlQuery=(filterQuery:!n,queryLocation:${page},type:${type})`,
              state: '',
            });

            // @ts-ignore property mock does not exists
            expect(forSureResetProps.history.replace.mock.calls[1][0]).toEqual({
              hash: '',
              pathname: examplePath,
              search:
                '?_g=()&timerange=(global:(from:1558048243696,fromStr:now-24h,kind:relative,linkTo:!(timeline),to:1558134643697,toStr:now),timeline:(from:1558048243696,fromStr:now-24h,kind:relative,linkTo:!(global),to:1558134643697,toStr:now))',
              state: '',
            });
          }
        );
      });
    });
  });
});
