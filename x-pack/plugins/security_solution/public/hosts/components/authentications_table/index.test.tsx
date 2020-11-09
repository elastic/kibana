/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { getOr } from 'lodash/fp';
import React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import '../../../common/mock/match_media';
import {
  apolloClientObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../../common/mock';
import { createStore, State } from '../../../common/store';
import { hostsModel } from '../../store';
import { mockData } from './mock';
import * as i18n from './translations';
import { AuthenticationTable, getAuthenticationColumnsCurated } from '.';

describe('Authentication Table Component', () => {
  const loadPage = jest.fn();
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  );

  beforeEach(() => {
    store = createStore(
      state,
      SUB_PLUGINS_REDUCER,
      apolloClientObservable,
      kibanaObservable,
      storage
    );
  });

  describe('rendering', () => {
    test('it renders the authentication table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <AuthenticationTable
            data={mockData.Authentications.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.Authentications.pageInfo)}
            id="authentication"
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(
              false,
              'showMorePagesIndicator',
              mockData.Authentications.pageInfo
            )}
            totalCount={mockData.Authentications.totalCount}
            type={hostsModel.HostsType.page}
          />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('Connect(AuthenticationTableComponent)')).toMatchSnapshot();
    });
  });

  describe('columns', () => {
    test('on hosts page, we expect to get all columns', () => {
      expect(getAuthenticationColumnsCurated(hostsModel.HostsType.page).length).toEqual(9);
    });

    test('on host details page, we expect to remove two columns', () => {
      const columns = getAuthenticationColumnsCurated(hostsModel.HostsType.details);
      expect(columns.length).toEqual(7);
    });

    test('on host details page, we should have Last Failed Destination column', () => {
      const columns = getAuthenticationColumnsCurated(hostsModel.HostsType.page);
      expect(columns.some((col) => col.name === i18n.LAST_FAILED_DESTINATION)).toEqual(true);
    });

    test('on host details page, we should not have Last Failed Destination column', () => {
      const columns = getAuthenticationColumnsCurated(hostsModel.HostsType.details);
      expect(columns.some((col) => col.name === i18n.LAST_FAILED_DESTINATION)).toEqual(false);
    });

    test('on host page, we should have Last Successful Destination column', () => {
      const columns = getAuthenticationColumnsCurated(hostsModel.HostsType.page);
      expect(columns.some((col) => col.name === i18n.LAST_SUCCESSFUL_DESTINATION)).toEqual(true);
    });

    test('on host details page, we should not have Last Successful Destination column', () => {
      const columns = getAuthenticationColumnsCurated(hostsModel.HostsType.details);
      expect(columns.some((col) => col.name === i18n.LAST_SUCCESSFUL_DESTINATION)).toEqual(false);
    });
  });
});
