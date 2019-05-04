/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep, getOr } from 'lodash/fp';
import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { mockGlobalState } from '../../../../mock';
import { createStore, hostsModel, State } from '../../../../store';
import { getEmptyValue } from '../../../empty_value';

import { EventsTable, formatIpSafely } from './index';
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
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)}
            loadMore={loadMore}
            type={hostsModel.HostsType.page}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('formatIpSafely', () => {
    test('formatIpSafely happy path', () => {
      const wrapperSourceIp = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{formatIpSafely('source.ip[0]', mockData.Events.edges[0].node)}</p>
        </ThemeProvider>
      );

      const wrapperHostName = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{formatIpSafely('host.name[0]', mockData.Events.edges[0].node)}</p>
        </ThemeProvider>
      );

      expect(wrapperSourceIp.text()).toBe('10.142.0.6');
      expect(wrapperHostName.text()).toBe('siem-general');
    });

    test('formatIpSafely unhappy path', () => {
      const wrapperSourceIp = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{formatIpSafely('.ip', mockData.Events.edges[0].node)}</p>
        </ThemeProvider>
      );

      const wrapperHostName = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{formatIpSafely('.name', mockData.Events.edges[0].node)}</p>
        </ThemeProvider>
      );

      expect(wrapperSourceIp.text()).toBe(getEmptyValue());
      expect(wrapperHostName.text()).toBe(getEmptyValue());
    });

    test('formatIpSafely not happy with IP ranges that are of a particular size', () => {
      const ecs = cloneDeep(mockData.Events.edges[0].node);
      ecs.source!.ip = ['255.255.255.255'];
      const wrapperSourceIp = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{formatIpSafely('source.ip[0]', ecs)}</p>
        </ThemeProvider>
      );

      expect(wrapperSourceIp.text()).toBe('255.255.255.255');
    });

    test('formatIpSafely test of IPv6 max string length of 45', () => {
      const ecs = cloneDeep(mockData.Events.edges[0].node);
      ecs.source!.ip = ['0000:0000:0000:0000:0000:ffff:192.168.100.228'];
      const wrapperSourceIp = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{formatIpSafely('source.ip[0]', ecs)}</p>
        </ThemeProvider>
      );

      expect(wrapperSourceIp.text()).toBe('0000:0000:0000:0000:0000:ffff:192.168.100.228');
    });
  });
});
