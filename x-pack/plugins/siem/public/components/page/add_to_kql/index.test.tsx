/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { escapeQueryValue } from '../../../lib/keury';
import {
  apolloClientObservable,
  mockGlobalState,
  TestProviders,
  mockIndexPattern,
} from '../../../mock';
import { createStore, hostsModel, networkModel, State } from '../../../store';

import { AddToKql } from '.';

describe('AddToKql Component', async () => {
  const state: State = mockGlobalState;
  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });

  test('Rendering', async () => {
    const wrapper = shallow(
      <TestProviders store={store}>
        <AddToKql
          indexPattern={mockIndexPattern}
          expression={`host.name: ${escapeQueryValue('siem-kibana')}`}
          componentFilterType="hosts"
          type={hostsModel.HostsType.page}
        >
          <>{'siem-kibana'}</>
        </AddToKql>
      </TestProviders>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('Rendering tooltip', async () => {
    const wrapper = shallow(
      <TestProviders store={store}>
        <AddToKql
          indexPattern={mockIndexPattern}
          expression={`host.name: ${escapeQueryValue('siem-kibana')}`}
          componentFilterType="hosts"
          type={hostsModel.HostsType.page}
        >
          <>{'siem-kibana'}</>
        </AddToKql>
      </TestProviders>
    );

    wrapper.simulate('mouseenter');
    wrapper.update();
    expect(wrapper.find('[data-test-subj="hover-actions-container"] svg').first()).toBeTruthy();
  });

  test('Functionality with hosts state', async () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <AddToKql
          indexPattern={mockIndexPattern}
          expression={`host.name: ${escapeQueryValue('siem-kibana')}`}
          componentFilterType="hosts"
          type={hostsModel.HostsType.page}
        >
          <>{'siem-kibana'}</>
        </AddToKql>
      </TestProviders>
    );

    wrapper
      .simulate('mouseenter')
      .find('[data-test-subj="hover-actions-container"] .euiToolTipAnchor svg')
      .first()
      .simulate('click');
    wrapper.update();

    expect(store.getState().hosts.page).toEqual({
      queries: {
        authentications: {
          limit: 10,
        },
        hosts: {
          limit: 10,
          direction: 'desc',
          sortField: 'lastSeen',
        },
        events: {
          limit: 10,
        },
        uncommonProcesses: {
          limit: 10,
        },
      },
      filterQuery: {
        kuery: {
          kind: 'kuery',
          expression: 'host.name: siem-kibana',
        },
        serializedQuery:
          '{"bool":{"should":[{"match":{"host.name":"siem-kibana"}}],"minimum_should_match":1}}',
      },
      filterQueryDraft: {
        kind: 'kuery',
        expression: 'host.name: siem-kibana',
      },
    });
  });

  test('Functionality with network state', async () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <AddToKql
          indexPattern={mockIndexPattern}
          expression={`host.name: ${escapeQueryValue('siem-kibana')}`}
          componentFilterType="network"
          type={networkModel.NetworkType.page}
        >
          <>{'siem-kibana'}</>
        </AddToKql>
      </TestProviders>
    );

    wrapper
      .simulate('mouseenter')
      .find('[data-test-subj="hover-actions-container"] .euiToolTipAnchor svg')
      .first()
      .simulate('click');
    wrapper.update();

    expect(store.getState().network.page).toEqual({
      queries: {
        topNFlow: {
          limit: 10,
          flowDirection: 'uniDirectional',
          flowTarget: 'source',
          topNFlowSort: {
            field: 'bytes',
            direction: 'desc',
          },
        },
        dns: {
          limit: 10,
          dnsSortField: {
            field: 'queryCount',
            direction: 'desc',
          },
          isPtrIncluded: false,
        },
      },
      filterQuery: {
        kuery: {
          kind: 'kuery',
          expression: 'host.name: siem-kibana',
        },
        serializedQuery:
          '{"bool":{"should":[{"match":{"host.name":"siem-kibana"}}],"minimum_should_match":1}}',
      },
      filterQueryDraft: {
        kind: 'kuery',
        expression: 'host.name: siem-kibana',
      },
    });
  });
});
