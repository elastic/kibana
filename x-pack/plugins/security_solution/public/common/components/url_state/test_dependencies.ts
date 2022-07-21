/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query } from '@kbn/es-query';
import { navTabs } from '../../../app/home/home_navigations';
import { SecurityPageName } from '../../../app/types';

import { CONSTANTS } from './constants';
import type { UrlStateContainerPropTypes, LocationTypes } from './types';
import { HostsTableType } from '../../../hosts/store/model';
import { TimelineTabs } from '../../../../common/types/timeline';

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';

export const getFilterQuery = (): Query => ({
  query: 'host.name:"siem-es"',
  language: 'kuery',
});

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
mockDispatch.mockImplementation((fn) => fn);

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
  pageName: SecurityPageName.network,
  detailName: undefined,
  tabName: HostsTableType.authentications,
  search: '',
  pathName: '/network',
  navTabs,
  indexPattern: {
    fields: [
      {
        name: '@timestamp',
        type: 'date',
      },
    ],
    title: 'filebeat-*,packetbeat-*',
  },
  urlState: {
    [CONSTANTS.timeline]: {
      activeTab: TimelineTabs.query,
      id: '',
      isOpen: false,
    },
  },
  history: {
    ...mockHistory,
    location: defaultLocation,
  },
};

export const getMockProps = (
  location = defaultLocation,
  kqlQueryKey = CONSTANTS.networkPage,
  kqlQueryValue: Query | null,
  pageName: SecurityPageName,
  detailName: string | undefined
): UrlStateContainerPropTypes => ({
  ...defaultProps,
  urlState: {
    ...defaultProps.urlState,
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
  pageName: SecurityPageName;
  detailName: string | undefined;
}

export const getMockPropsObj = ({ page, examplePath, pageName, detailName }: GetMockPropsObj) => ({
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
