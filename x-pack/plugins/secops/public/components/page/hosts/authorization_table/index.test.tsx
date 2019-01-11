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

import { AuthorizationTable } from '.';
import { mockGlobalState } from '../../../../mock';
import { createStore, State } from '../../../../store';
import { mockData } from './mock';

describe('Authorization Table Component', () => {
  const loadMore = jest.fn();
  const state: State = mockGlobalState;

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default Authorization table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <AuthorizationTable
            loading={false}
            data={mockData.Authorizations.edges}
            totalCount={mockData.Authorizations.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Authorizations.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.Authorizations.pageInfo)!}
            loadMore={loadMore}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
