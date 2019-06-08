/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionCreator } from 'typescript-fsa';
import { hostsModel, KueryFilterQuery, networkModel, SerializedFilterQuery } from '../../store';
import { UrlStateContainerPropTypes, LocationTypesNoNull } from './types';
import { CONSTANTS } from './constants';
import { InputsModelId } from '../../store/inputs/constants';

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';

export const filterQuery: KueryFilterQuery = {
  expression: 'host.name:"siem-es"',
  kind: 'kuery',
};

export const serializedFilterQuery: SerializedFilterQuery = {
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

export const mockHistory = {
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

export const defaultProps: UrlStateContainerPropTypes = {
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
        [CONSTANTS.timerange]: {
          from: 1558048243696,
          fromStr: 'now-24h',
          kind: 'relative',
          to: 1558134643697,
          toStr: 'now',
        },
        linkTo: ['timeline'],
      },
      timeline: {
        [CONSTANTS.timerange]: {
          from: 1558048243696,
          fromStr: 'now-24h',
          kind: 'relative',
          to: 1558134643697,
          toStr: 'now',
        },
        linkTo: ['global'],
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

export const getMockProps = (
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

export const getMockPropsObj = ({ page, examplePath, namespaceLower, type }: GetMockPropsObj) => ({
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

// silly that this needs to be an array and not an object
// https://jestjs.io/docs/en/api#testeachtable-name-fn-timeout
export const testCases = [
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
