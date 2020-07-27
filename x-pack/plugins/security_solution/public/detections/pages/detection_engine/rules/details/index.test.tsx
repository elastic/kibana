/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import '../../../../../common/mock/match_media';
import {
  apolloClientObservable,
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
} from '../../../../../common/mock';
import { RuleDetailsPageComponent } from './index';
import { createStore, State } from '../../../../../common/store';
import { setAbsoluteRangeDatePicker } from '../../../../../common/store/inputs/actions';
import { useUserInfo } from '../../../../components/user_info';
import { useWithSource } from '../../../../../common/containers/source';
import { useParams } from 'react-router-dom';
import { mockHistory, Router } from '../../../../../cases/components/__mock__/router';

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../../../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../../../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));
jest.mock('../../../../containers/detection_engine/lists/use_lists_config');
jest.mock('../../../../../common/components/link_to');
jest.mock('../../../../components/user_info');
jest.mock('../../../../../common/containers/source');
jest.mock('../../../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({
    from: '2020-07-07T08:20:18.966Z',
    isInitializing: false,
    to: '2020-07-08T08:20:18.966Z',
    setQuery: jest.fn(),
  }),
}));

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn(),
    useHistory: jest.fn(),
  };
});

const state: State = {
  ...mockGlobalState,
};
const { storage } = createSecuritySolutionStorageMock();
const store = createStore(
  state,
  SUB_PLUGINS_REDUCER,
  apolloClientObservable,
  kibanaObservable,
  storage
);

describe('RuleDetailsPageComponent', () => {
  beforeAll(() => {
    (useUserInfo as jest.Mock).mockReturnValue({});
    (useParams as jest.Mock).mockReturnValue({});
    (useWithSource as jest.Mock).mockReturnValue({
      indicesExist: true,
      indexPattern: {},
    });
  });

  it('renders correctly', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Router history={mockHistory}>
          <RuleDetailsPageComponent
            query={{ query: '', language: 'language' }}
            filters={[]}
            setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
          />
        </Router>
      </TestProviders>,
      {
        wrappingComponent: TestProviders,
      }
    );

    expect(wrapper.find('[data-test-subj="header-page-title"]').exists()).toBe(true);
  });
});
