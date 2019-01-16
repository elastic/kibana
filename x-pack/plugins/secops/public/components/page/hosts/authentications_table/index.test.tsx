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

import { AuthenticationTable } from '.';
import { mockGlobalState } from '../../../../mock';
import { createStore, State } from '../../../../store';
import { mockData } from './mock';

describe('Authentication Table Component', () => {
  const loadMore = jest.fn();
  const state: State = mockGlobalState;

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default Authentication table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <AuthenticationTable
            loading={false}
            data={mockData.Authentications.edges}
            totalCount={mockData.Authentications.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Authentications.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.Authentications.pageInfo)!}
            loadMore={loadMore}
            startDate={1546965070707}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
