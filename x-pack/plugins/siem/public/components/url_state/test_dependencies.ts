/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionCreator } from 'typescript-fsa';
import { DispatchUpdateTimeline } from '../open_timeline/types';
import { navTabs } from '../../pages/home/home_navigations';
import { SiemPageName } from '../../pages/home/types';
import { hostsModel, networkModel } from '../../store';
import { inputsActions } from '../../store/actions';
import { HostsTableType } from '../../store/hosts/model';

import { CONSTANTS } from './constants';
import { dispatchSetInitialStateFromUrl } from './initialize_redux_by_url';
import { UrlStateContainerPropTypes, LocationTypes } from './types';
import { Query } from '../../../../../../../src/plugins/data/public';

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';

export const getFilterQuery = (): Query => ({
  query: 'host.name:"siem-es"',
  language: 'kuery',
});

export const mockSetFilterQuery: jest.Mock = (inputsActions.setFilterQuery as unknown) as jest.Mock;
export const mockAddGlobalLinkTo: jest.Mock = (inputsActions.addGlobalLinkTo as unknown) as jest.Mock;
export const mockAddTimelineLinkTo: jest.Mock = (inputsActions.addTimelineLinkTo as unknown) as jest.Mock;
export const mockRemoveGlobalLinkTo: jest.Mock = (inputsActions.removeGlobalLinkTo as unknown) as jest.Mock;
export const mockRemoveTimelineLinkTo: jest.Mock = (inputsActions.removeTimelineLinkTo as unknown) as jest.Mock;
export const mockSetAbsoluteRangeDatePicker: jest.Mock = (inputsActions.setAbsoluteRangeDatePicker as unknown) as jest.Mock;
export const mockSetRelativeRangeDatePicker: jest.Mock = (inputsActions.setRelativeRangeDatePicker as unknown) as jest.Mock;

jest.mock('../../store/actions', () => ({
  inputsActions: {
    addGlobalLinkTo: jest.fn(),
    addTimelineLinkTo: jest.fn(),
    removeGlobalLinkTo: jest.fn(),
    removeTimelineLinkTo: jest.fn(),
    setAbsoluteRangeDatePicker: jest.fn(),
    setRelativeRangeDatePicker: jest.fn(),
    setFilterQuery: jest.fn(),
  },
}));

const defaultLocation = {
  hash: '',
  pathname: '/network',
  search: '',
  state: '',
};

const mockDispatch = jest.fn();
mockDispatch.mockImplementation(fn => fn);

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
  pageName: SiemPageName.network,
  detailName: undefined,
  tabName: HostsTableType.authentications,
  search: '',
  pathName: '/network',
  navTabs,
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
    [CONSTANTS.appQuery]: { query: '', language: 'kuery' },
    [CONSTANTS.filters]: [],
    [CONSTANTS.timeline]: {
      id: '',
      isOpen: false,
    },
  },
  setInitialStateFromUrl: dispatchSetInitialStateFromUrl(mockDispatch),
  updateTimeline: (jest.fn() as unknown) as DispatchUpdateTimeline,
  updateTimelineIsLoading: (jest.fn() as unknown) as ActionCreator<{
    id: string;
    isLoading: boolean;
  }>,
  history: {
    ...mockHistory,
    location: defaultLocation,
  },
};

export const getMockProps = (
  location = defaultLocation,
  kqlQueryKey = CONSTANTS.networkPage,
  kqlQueryValue: Query | null,
  pageName: string,
  detailName: string | undefined
): UrlStateContainerPropTypes => ({
  ...defaultProps,
  urlState: {
    ...defaultProps.urlState,
    [CONSTANTS.appQuery]: kqlQueryValue || { query: '', language: 'kuery' },
  },
  history: {
    ...mockHistory,
    location,
  },
  detailName,
  pageName,
  pathName: location.pathname,
  search: location.search,
});

interface GetMockPropsObj {
  examplePath: string;
  namespaceLower: string;
  page: LocationTypes;
  pageName: string;
  detailName: string | undefined;
}

export const getMockPropsObj = ({
  page,
  examplePath,
  namespaceLower,
  pageName,
  detailName,
}: GetMockPropsObj) => ({
  noSearch: {
    undefinedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: '?',
        state: '',
      },
      page,
      null,
      pageName,
      detailName
    ),
    definedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: '?',
        state: '',
      },
      page,
      getFilterQuery(),
      pageName,
      detailName
    ),
  },
  relativeTimeSearch: {
    undefinedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: `?query=(language:kuery,query:'host.name:%22siem-es%22')&timerange=(global:(linkTo:!(),timerange:(from:1558591200000,fromStr:now-1d%2Fd,kind:relative,to:1558677599999,toStr:now-1d%2Fd)),timeline:(linkTo:!(),timerange:(from:1558732849370,fromStr:now-15m,kind:relative,to:1558733749370,toStr:now)))`,
        state: '',
      },
      page,
      null,
      pageName,
      detailName
    ),
    definedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: `?query=(language:kuery,query:'host.name:%22siem-es%22')&timerange=(global:(linkTo:!(),timerange:(from:1558591200000,fromStr:now-1d%2Fd,kind:relative,to:1558677599999,toStr:now-1d%2Fd)),timeline:(linkTo:!(),timerange:(from:1558732849370,fromStr:now-15m,kind:relative,to:1558733749370,toStr:now)))`,
        state: '',
      },
      page,
      getFilterQuery(),
      pageName,
      detailName
    ),
    undefinedLinkQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: `?query=(language:kuery,query:'host.name:%22siem-es%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:1558591200000,fromStr:now-1d%2Fd,kind:relative,to:1558677599999,toStr:now-1d%2Fd)),timeline:(linkTo:!(global),timerange:(from:1558732849370,fromStr:now-15m,kind:relative,to:1558733749370,toStr:now)))`,
        state: '',
      },
      page,
      null,
      pageName,
      detailName
    ),
  },
  absoluteTimeSearch: {
    undefinedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search:
          '?timerange=(global:(linkTo:!(timeline),timerange:(from:1556736012685,kind:absolute,to:1556822416082)),timeline:(linkTo:!(global),timerange:(from:1556736012685,kind:absolute,to:1556822416082)))',
        state: '',
      },
      page,
      null,
      pageName,
      detailName
    ),
    definedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search:
          '?timerange=(global:(linkTo:!(timeline),timerange:(from:1556736012685,kind:absolute,to:1556822416082)),timeline:(linkTo:!(global),timerange:(from:1556736012685,kind:absolute,to:1556822416082)))',
        state: '',
      },
      page,
      getFilterQuery(),
      pageName,
      detailName
    ),
  },
  oppositeQueryLocationSearch: {
    undefinedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: `?query=(query:'host.name:%22siem-es%22',language:kuery)&timerange=(global:(linkTo:!(),timerange:(from:1558591200000,fromStr:now-1d%2Fd,kind:relative,to:1558677599999,toStr:now-1d%2Fd)),timeline:(linkTo:!(),timerange:(from:1558732849370,fromStr:now-15m,kind:relative,to:1558733749370,toStr:now)))`,
        state: '',
      },
      page,
      null,
      pageName,
      detailName
    ),
  },
});

// silly that this needs to be an array and not an object
// https://jestjs.io/docs/en/api#testeachtable-name-fn-timeout
export const testCases: Array<[
  LocationTypes,
  string,
  string,
  string,
  string | null,
  string,
  undefined | string
]> = [
  [
    /* page */ CONSTANTS.networkPage,
    /* namespaceLower */ 'network',
    /* namespaceUpper */ 'Network',
    /* pathName */ '/network',
    /* type */ networkModel.NetworkType.page,
    /* pageName */ SiemPageName.network,
    /* detailName */ undefined,
  ],
  [
    /* page */ CONSTANTS.hostsPage,
    /* namespaceLower */ 'hosts',
    /* namespaceUpper */ 'Hosts',
    /* pathName */ '/hosts',
    /* type */ hostsModel.HostsType.page,
    /* pageName */ SiemPageName.hosts,
    /* detailName */ undefined,
  ],
  [
    /* page */ CONSTANTS.hostsDetails,
    /* namespaceLower */ 'hosts',
    /* namespaceUpper */ 'Hosts',
    /* pathName */ '/hosts/siem-es',
    /* type */ hostsModel.HostsType.details,
    /* pageName */ SiemPageName.hosts,
    /* detailName */ 'host-test',
  ],
  [
    /* page */ CONSTANTS.networkDetails,
    /* namespaceLower */ 'network',
    /* namespaceUpper */ 'Network',
    /* pathName */ '/network/ip/100.90.80',
    /* type */ networkModel.NetworkType.details,
    /* pageName */ SiemPageName.network,
    /* detailName */ '100.90.80',
  ],
  [
    /* page */ CONSTANTS.overviewPage,
    /* namespaceLower */ 'overview',
    /* namespaceUpper */ 'Overview',
    /* pathName */ '/overview',
    /* type */ null,
    /* pageName */ SiemPageName.overview,
    /* detailName */ undefined,
  ],
  [
    /* page */ CONSTANTS.timelinePage,
    /* namespaceLower */ 'timeline',
    /* namespaceUpper */ 'Timeline',
    /* pathName */ '/timeline',
    /* type */ null,
    /* pageName */ SiemPageName.timelines,
    /* detailName */ undefined,
  ],
];
