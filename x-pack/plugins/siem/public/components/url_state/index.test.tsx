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
import { UrlStateContainerPropTypes } from './types';
import { CONSTANTS } from './constants';
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
  location,
  push: jest.fn(),
  replace: jest.fn(),
};

const filterQuery: KueryFilterQuery = {
  expression: 'host.name:"siem-es"',
  kind: 'kuery',
};

const mockProps: UrlStateContainerPropTypes = {
  match: {
    isExact: true,
    params: '',
    path: '',
    url: '',
  },
  history: mockHistory,
  location,
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
        filterQuery,
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
};

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
    jest.clearAllMocks();
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
  test('componentDidUpdate - timerange redux state updates the url', async () => {
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
  test('componentDidUpdate - kql query redux state updates the url', async () => {
    const wrapper = shallow(<UrlStateContainerLifecycle {...mockProps} />);

    const newUrlState = {
      [CONSTANTS.kqlQuery]: [
        {
          filterQuery,
          type: networkModel.NetworkType.details,
          model: KueryFilterModel.network,
        },
      ],
    };

    wrapper.setProps({ urlState: newUrlState });
    wrapper.update();
    await wait(1000);
    expect(mockHistory.replace.mock.calls[1][0]).toStrictEqual({
      hash: '',
      pathname: '/network',
      search:
        "?kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),model:network,type:details)",
      state: '',
    });
  });
  describe('handleInitialize', () => {
    test('handleInitialize', () => {
      const wrapper = shallow(<UrlStateContainerLifecycle {...mockProps} />);
      const urlStateComponents = wrapper.find('[data-test-subj="urlStateComponents"]');
      urlStateComponents.exists();
      // console.log('WWWWW I', wrapper.instance());
    });
  });
});
