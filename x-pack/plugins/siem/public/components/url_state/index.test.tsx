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
import { StaticIndexPattern } from 'ui/index_patterns';

import { UrlStateContainer, UrlStateContainerLifecycle } from './';
import { LocationTypesNoNull, UrlStateContainerPropTypes } from './types';
import { CONSTANTS } from './constants';
import { apolloClientObservable, mockGlobalState, TestProviders } from '../../mock';
import {
  createStore,
  hostsModel,
  KueryFilterQuery,
  networkModel,
  SerializedFilterQuery,
  State,
} from '../../store';
import { ActionCreator } from 'typescript-fsa';
import { InputsModelId } from '../../store/inputs/model';
import { wait } from '../../lib/helpers';

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';

const filterQuery: KueryFilterQuery = {
  expression: 'host.name:"siem-es"',
  kind: 'kuery',
};

const serializedFilterQuery: SerializedFilterQuery = {
  kuery: filterQuery,
  serializedQuery: JSON.stringify({
    bool: { should: [{ match_phrase: { 'host.name': 'siem-es' } }], minimum_should_match: 1 },
  }),
};

const defaultLocation = {
  hash: '',
  pathname: '/network',
  search: '',
  state: '',
};

const mockHistory = {
  action: pop,
  block: jest.fn(),
  createHref: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  length: 2,
  listen: jest.fn(),
  location: defaultLocation,
  push: jest.fn(),
  replace: jest.fn(),
};

const defaultProps: UrlStateContainerPropTypes = {
  match: {
    isExact: true,
    params: '',
    path: '',
    url: '',
  },
  indexPattern: {
    fields: [
      {
        aggregatable: true,
        name: '@timestamp',
        searchable: true,
        type: 'date',
      },
    ],
    title: 'filebeat-*,packetbeat-*',
  },
  urlState: {
    [CONSTANTS.timerange]: {
      global: {
        from: 1558048243696,
        fromStr: 'now-24h',
        kind: 'relative',
        linkTo: ['timeline'],
        to: 1558134643697,
        toStr: 'now',
      },
      timeline: {
        from: 1558048243696,
        fromStr: 'now-24h',
        kind: 'relative',
        linkTo: ['global'],
        to: 1558134643697,
        toStr: 'now',
      },
    },
    [CONSTANTS.kqlQuery]: {
      [CONSTANTS.hostsDetails]: {
        filterQuery: null,
        queryLocation: CONSTANTS.hostsDetails,
        type: hostsModel.HostsType.details,
      },
      [CONSTANTS.hostsPage]: {
        filterQuery: null,
        queryLocation: CONSTANTS.hostsPage,
        type: hostsModel.HostsType.page,
      },
      [CONSTANTS.networkDetails]: {
        filterQuery: null,
        queryLocation: CONSTANTS.networkDetails,
        type: networkModel.NetworkType.details,
      },
      [CONSTANTS.networkPage]: {
        filterQuery: null,
        queryLocation: CONSTANTS.networkPage,
        type: networkModel.NetworkType.page,
      },
    },
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
  history: {
    ...mockHistory,
    location: defaultLocation,
  },
  location: defaultLocation,
};

const getMockProps = (
  location = defaultLocation,
  kqlQueryKey = CONSTANTS.networkPage,
  kqlQueryValue: KueryFilterQuery | null
): UrlStateContainerPropTypes => ({
  ...defaultProps,
  urlState: {
    ...defaultProps.urlState,
    [CONSTANTS.kqlQuery]: {
      ...defaultProps.urlState[CONSTANTS.kqlQuery],
      [kqlQueryKey]: {
        ...defaultProps.urlState[CONSTANTS.kqlQuery][kqlQueryKey],
        filterQuery: kqlQueryValue,
      },
    },
  },
  history: {
    ...mockHistory,
    location,
  },
  location,
});

interface GetMockPropsObj {
  examplePath: string;
  namespaceLower: string;
  page: LocationTypesNoNull;
  type: string;
}
const getMockPropsObj = ({ page, examplePath, namespaceLower, type }: GetMockPropsObj) => ({
  noSearch: {
    undefinedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: '?_g=()',
        state: '',
      },
      page,
      null
    ),
    definedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: '?_g=()',
        state: '',
      },
      page,
      filterQuery
    ),
  },
  relativeTimeSearch: {
    undefinedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: `?_g=()&kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:${page},type:${type})&timerange=(global:(linkTo:!(),timerange:(from:1558591200000,fromStr:now-1d%2Fd,kind:relative,to:1558677599999,toStr:now-1d%2Fd)),timeline:(linkTo:!(),timerange:(from:1558732849370,fromStr:now-15m,kind:relative,to:1558733749370,toStr:now)))`,
        state: '',
      },
      page,
      null
    ),
    definedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: `?_g=()&kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:${page},type:${type})&timerange=(global:(linkTo:!(),timerange:(from:1558591200000,fromStr:now-1d%2Fd,kind:relative,to:1558677599999,toStr:now-1d%2Fd)),timeline:(linkTo:!(),timerange:(from:1558732849370,fromStr:now-15m,kind:relative,to:1558733749370,toStr:now)))`,
        state: '',
      },
      page,
      filterQuery
    ),
  },
  absoluteTimeSearch: {
    undefinedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search:
          '?_g=()&timerange=(global:(linkTo:!(timeline),timerange:(from:1556736012685,kind:absolute,to:1556822416082)),timeline:(linkTo:!(global),timerange:(from:1556736012685,kind:absolute,to:1556822416082)))',
        state: '',
      },
      page,
      null
    ),
    definedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search:
          '?_g=()&timerange=(global:(linkTo:!(timeline),timerange:(from:1556736012685,kind:absolute,to:1556822416082)),timeline:(linkTo:!(global),timerange:(from:1556736012685,kind:absolute,to:1556822416082)))',
        state: '',
      },
      page,
      filterQuery
    ),
  },
  oppositeQueryLocationSearch: {
    undefinedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: `?_g=()&kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:${
          namespaceLower === 'hosts' ? 'network' : 'hosts'
        }.page,type:${type})&timerange=(global:(linkTo:!(),timerange:(from:1558591200000,fromStr:now-1d%2Fd,kind:relative,to:1558677599999,toStr:now-1d%2Fd)),timeline:(linkTo:!(),timerange:(from:1558732849370,fromStr:now-15m,kind:relative,to:1558733749370,toStr:now)))`,
        state: '',
      },
      page,
      null
    ),
  },
});

let mockProps: UrlStateContainerPropTypes;

const indexPattern: StaticIndexPattern = {
  title: 'logstash-*',
  fields: [
    {
      name: 'response',
      type: 'number',
      aggregatable: true,
      searchable: true,
    },
  ],
};

describe('UrlStateContainer', () => {
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });
  test('mounts and renders', () => {
    const wrapper = mount(
      <MockedProvider>
        <TestProviders store={store}>
          <Router history={mockHistory}>
            <UrlStateContainer indexPattern={indexPattern} />
          </Router>
        </TestProviders>
      </MockedProvider>
    );
    const urlStateComponents = wrapper.find('[data-test-subj="urlStateComponents"]');
    urlStateComponents.exists();
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  describe('componentDidUpdate', () => {
    test('timerange redux state updates the url', async () => {
      mockProps = getMockPropsObj({
        page: CONSTANTS.networkPage,
        examplePath: '/network',
        namespaceLower: 'network',
        type: networkModel.NetworkType.page,
      }).noSearch.definedQuery;
      const wrapper = shallow(<UrlStateContainerLifecycle {...mockProps} />);

      const newUrlState = {
        [CONSTANTS.timerange]: {
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
      await wait(1000);
      expect(mockHistory.replace.mock.calls[1][0]).toStrictEqual({
        hash: '',
        pathname: '/network',
        search:
          '?timerange=(global:(linkTo:!(timeline),timerange:(from:0,fromStr:now-24h,kind:relative,to:1,toStr:now)),timeline:(linkTo:!(global),timerange:(from:0,fromStr:now-24h,kind:relative,to:1,toStr:now)))',
        state: '',
      });
    });
    test('kql query redux state updates the url', async () => {
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
      await wait(1000);
      expect(mockHistory.replace.mock.calls[1][0]).toStrictEqual({
        hash: '',
        pathname: '/network',
        search:
          "?_g=()&kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:network.page,type:page)",
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
          // @ts-ignore property mock does not exists
          // console.log(`set${namespaceUpper}Kql`);
          // console.log('HEYHEY', defaultProps[`set${namespaceUpper}Kql`]);
          // console.log('HEYHEY', mockProps[`set${namespaceUpper}Kql`]);
          const functionName =
            namespaceUpper === 'Network' ? defaultProps.setNetworkKql : defaultProps.setHostsKql;
          // @ts-ignore property mock does not exists
          expect(functionName.mock.calls[0][0]).toEqual({
            filterQuery: serializedFilterQuery,
            // @ts-ignore
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
            await wait(1000);

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
