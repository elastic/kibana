/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import '../../../../../common/mock/match_media';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
} from '../../../../../common/mock';
import { RuleDetailsPage } from './index';
import { createStore, State } from '../../../../../common/store';
import { useUserData } from '../../../../components/user_info';
import { useSourcererScope } from '../../../../../common/containers/sourcerer';
import { useParams } from 'react-router-dom';
import { mockHistory, Router } from '../../../../../common/mock/router';
import { mockTimelines } from '../../../../../common/mock/mock_timelines_plugin';

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
jest.mock('../../../../../common/containers/sourcerer');
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

jest.mock('../../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../../common/lib/kibana');

  return {
    ...original,
    useUiSetting$: jest.fn().mockReturnValue([]),
    useKibana: () => ({
      services: {
        application: {
          ...original.useKibana().services.application,
          navigateToUrl: jest.fn(),
          capabilities: {
            actions: jest.fn().mockReturnValue({}),
            siem: { crud_alerts: true, read_alerts: true },
          },
        },
        timelines: { ...mockTimelines },
        data: {
          query: {
            filterManager: jest.fn().mockReturnValue({}),
          },
        },
      },
    }),
    useToasts: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
    }),
  };
});

const state: State = {
  ...mockGlobalState,
};
const { storage } = createSecuritySolutionStorageMock();
const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

describe('RuleDetailsPageComponent', () => {
  beforeAll(() => {
    (useUserData as jest.Mock).mockReturnValue([{}]);
    (useParams as jest.Mock).mockReturnValue({});
    (useSourcererScope as jest.Mock).mockReturnValue({
      indicesExist: true,
      indexPattern: {},
    });
  });

  it('renders correctly', async () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Router history={mockHistory}>
          <RuleDetailsPage />
        </Router>
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="header-page-title"]').exists()).toBe(true);
    });
  });
});
