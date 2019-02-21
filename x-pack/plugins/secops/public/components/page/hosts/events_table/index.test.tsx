/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { getOr } from 'lodash/fp';
import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { mockGlobalState } from '../../../../mock';
import { createStore, hostsModel, State } from '../../../../store';
import { getEmptyValue } from '../../../empty_value';
import { EventsTable, formatSafely } from './index';
import { mockData } from './mock';

describe('Load More Events Table Component', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });

  const loadMore = jest.fn();
  const state: State = mockGlobalState;

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default Events table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <EventsTable
            loading={false}
            data={mockData.Events.edges.map(i => i.node)}
            totalCount={mockData.Events.totalCount}
            tiebreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)!}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
            loadMore={loadMore}
            startDate={1546878704036}
            type={hostsModel.HostsType.page}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('formatSafely', () => {
    test('formatSafely happy path', () => {
      const wrapperSourceIp = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{formatSafely('source.ip', mockData.Events.edges[0].node)}</p>
        </ThemeProvider>
      );

      const wrapperHostName = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{formatSafely('host.name', mockData.Events.edges[0].node)}</p>
        </ThemeProvider>
      );

      expect(wrapperSourceIp.text()).toBe('10.142.0.6');
      expect(wrapperHostName.text()).toBe('siem-general');
    });

    test('formatSafely unhappy path', () => {
      const wrapperSourceIp = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{formatSafely('.ip', mockData.Events.edges[0].node)}</p>
        </ThemeProvider>
      );

      const wrapperHostName = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{formatSafely('.name', mockData.Events.edges[0].node)}</p>
        </ThemeProvider>
      );

      expect(wrapperSourceIp.text()).toBe(getEmptyValue());
      expect(wrapperHostName.text()).toBe(getEmptyValue());
    });
  });
});
