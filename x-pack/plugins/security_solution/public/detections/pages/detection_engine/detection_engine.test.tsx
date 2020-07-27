/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { useParams } from 'react-router-dom';

import '../../../common/mock/match_media';
import {
  apolloClientObservable,
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { DetectionEnginePageComponent } from './detection_engine';
import { useUserInfo } from '../../components/user_info';
import { useWithSource } from '../../../common/containers/source';
import { createStore, State } from '../../../common/store';
import { mockHistory, Router } from '../../../cases/components/__mock__/router';

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));
jest.mock('../../containers/detection_engine/lists/use_lists_config');
jest.mock('../../components/user_info');
jest.mock('../../../common/containers/source');
jest.mock('../../../common/components/link_to');
jest.mock('../../../common/containers/use_global_time', () => ({
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

describe('DetectionEnginePageComponent', () => {
  beforeAll(() => {
    (useParams as jest.Mock).mockReturnValue({});
    (useUserInfo as jest.Mock).mockReturnValue({});
    (useWithSource as jest.Mock).mockReturnValue({
      indicesExist: true,
      indexPattern: {},
    });
  });

  it('renders correctly', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Router history={mockHistory}>
          <DetectionEnginePageComponent
            query={{ query: 'query', language: 'language' }}
            filters={[]}
            setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
          />
        </Router>
      </TestProviders>
    );

    expect(wrapper.find('FiltersGlobal').exists()).toBe(true);
  });
});
