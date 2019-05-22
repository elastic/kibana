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
      await wait(1000);
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
      await wait(1000);
      expect(mockHistory.replace.mock.calls[1][0]).toStrictEqual({
        hash: '',
        pathname: '/network',
        search:
          "?kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),model:network,type:details)",
        state: '',
      });
    });
  });
  describe('isKqlForRoute', () => {
    test('host page and host page kuery', () => {
      const result = isKqlForRoute('/hosts', {
        filterQuery: {
          expression: 'host.name:"siem-kibana"',
          kind: 'kuery',
        },
        model: KueryFilterModel.hosts,
        type: hostsModel.HostsType.page,
      });
      expect(result).toBeTruthy();
    });
    test('host page and host details kuery', () => {
      const result = isKqlForRoute('/hosts', {
        filterQuery: {
          expression: 'host.name:"siem-kibana"',
          kind: 'kuery',
        },
        model: KueryFilterModel.hosts,
        type: hostsModel.HostsType.details,
      });
      expect(result).toBeFalsy();
    });
    test('host details and host details kuery', () => {
      const result = isKqlForRoute('/hosts/siem-kibana', {
        filterQuery: {
          expression: 'host.name:"siem-kibana"',
          kind: 'kuery',
        },
        model: KueryFilterModel.hosts,
        type: hostsModel.HostsType.details,
      });
      expect(result).toBeTruthy();
    });
    test('host details and host page kuery', () => {
      const result = isKqlForRoute('/hosts/siem-kibana', {
        filterQuery: {
          expression: 'host.name:"siem-kibana"',
          kind: 'kuery',
        },
        model: KueryFilterModel.hosts,
        type: hostsModel.HostsType.page,
      });
      expect(result).toBeFalsy();
    });
    test('network page and network page kuery', () => {
      const result = isKqlForRoute('/network', {
        filterQuery: {
          expression: 'network.name:"siem-kibana"',
          kind: 'kuery',
        },
        model: KueryFilterModel.network,
        type: networkModel.NetworkType.page,
      });
      expect(result).toBeTruthy();
    });
    test('network page and network details kuery', () => {
      const result = isKqlForRoute('/network', {
        filterQuery: {
          expression: 'network.name:"siem-kibana"',
          kind: 'kuery',
        },
        model: KueryFilterModel.network,
        type: networkModel.NetworkType.details,
      });
      expect(result).toBeFalsy();
    });
    test('network details and network details kuery', () => {
      const result = isKqlForRoute('/network/ip/10.100.7.198', {
        filterQuery: {
          expression: 'network.name:"siem-kibana"',
          kind: 'kuery',
        },
        model: KueryFilterModel.network,
        type: networkModel.NetworkType.details,
      });
      expect(result).toBeTruthy();
    });
    test('network details and network page kuery', () => {
      const result = isKqlForRoute('/network/ip/123.234.34', {
        filterQuery: {
          expression: 'network.name:"siem-kibana"',
          kind: 'kuery',
        },
        model: KueryFilterModel.network,
        type: networkModel.NetworkType.page,
      });
      expect(result).toBeFalsy();
    });
  });
});
