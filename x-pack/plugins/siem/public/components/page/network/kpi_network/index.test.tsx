/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { apolloClientObservable, mockGlobalState } from '../../../../mock';
import { createStore, State } from '../../../../store';

import { KpiNetworkComponent } from '.';
import { mockData } from './mock';

describe('KpiNetwork Component', () => {
  const state: State = mockGlobalState;
  const from = new Date('2019-06-15T06:00:00.000Z').valueOf();
  const to = new Date('2019-06-18T06:00:00.000Z').valueOf();
  const narrowDateRange = jest.fn();

  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });

  describe('rendering', () => {
    test('it renders loading icons', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <KpiNetworkComponent
            data={mockData.KpiNetwork}
            from={from}
            id="kpiNetwork"
            loading={true}
            to={to}
            narrowDateRange={narrowDateRange}
          />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('KpiNetworkComponent')).toMatchSnapshot();
    });

    test('it renders the default widget', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <KpiNetworkComponent
            data={mockData.KpiNetwork}
            from={from}
            id="kpiNetwork"
            loading={false}
            to={to}
            narrowDateRange={narrowDateRange}
          />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('KpiNetworkComponent')).toMatchSnapshot();
    });
  });
});
