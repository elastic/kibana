/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { getOr } from 'lodash/fp';
import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { apolloClientObservable, mockGlobalState } from '../../../../mock';
import { AuthenticationsEdges } from '../../../../graphql/types';
import { createStore, hostsModel, State } from '../../../../store';
import { Columns } from '../../../load_more_table';

import { mockData } from './mock';
import * as i18n from './translations';
import { AuthenticationTable, getAuthenticationColumnsCurated } from '.';

describe('Authentication Table Component', () => {
  const loadMore = jest.fn();
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });

  describe('rendering', () => {
    test('it renders the authentication table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <AuthenticationTable
            loading={false}
            data={mockData.Authentications.edges}
            totalCount={mockData.Authentications.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Authentications.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.Authentications.pageInfo)}
            loadMore={loadMore}
            type={hostsModel.HostsType.page}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
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

    test('on host details page, we should not have Last Failed Destination column', () => {
      const columns = getAuthenticationColumnsCurated(hostsModel.HostsType.details);
      expect(
        columns.includes(
          (col: Columns<AuthenticationsEdges>) => col.name === i18n.LAST_FAILED_DESTINATION
        )
      ).toEqual(false);
    });

    test('on host details page, we should not have Last Successful Destination column', () => {
      const columns = getAuthenticationColumnsCurated(hostsModel.HostsType.details);
      expect(
        columns.includes(
          (col: Columns<AuthenticationsEdges>) => col.name === i18n.LAST_SUCCESSFUL_DESTINATION
        )
      ).toEqual(false);
    });
  });
});
