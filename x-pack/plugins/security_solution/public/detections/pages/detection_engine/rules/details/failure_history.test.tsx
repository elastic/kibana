/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test/jest';

import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
} from '../../../../../common/mock';
import { FailureHistory } from './failure_history';
import { useRuleStatus } from '../../../../containers/detection_engine/rules';
jest.mock('../../../../containers/detection_engine/rules');

import { waitFor } from '@testing-library/react';

import '../../../../../common/mock/match_media';

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
jest.mock('../../../../containers/detection_engine/rules');
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
        http: original.useKibana().services.http,
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
    (useRuleStatus as jest.Mock).mockReturnValue([
      false,
      {
        status: 'succeeded',
        last_failure_at: new Date().toISOString(),
        last_failure_message: 'my fake failure message',
        failures: [],
      },
    ]);
  });

  it('renders correctly', async () => {
    // const wrapper = mount(
    //   <TestProviders store={store}>
    //     <Router history={mockHistory}>
    //       <RuleDetailsPage />
    //     </Router>
    //   </TestProviders>
    // );
    const wrapper = mount(
      <TestProviders store={store}>
        <Router history={mockHistory}>
          <FailureHistory id="id" />
        </Router>
      </TestProviders>
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await waitFor(() => {
      expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
    });
  });
});

describe('FailureHistory', () => {
  beforeAll(() => {
    (useRuleStatus as jest.Mock).mockReturnValue([false, null]);
  });

  it('renders correctly with no statuses', () => {
    const wrapper = shallow(<FailureHistory id="id" />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
  });

  // it.only('renders correctly with no statuses and deep', async () => {
  //   const wrapper = shallow(<FailureHistory id="id" />, {
  //     wrappingComponent: TestProviders,
  //   });

  //   await act(async () => {
  //     await nextTick();
  //     wrapper.update();
  //   });

  //   // console.error(wrapper.dive().shallow().shallow().text());

  //   // console.error(wrapper.find('EuiBasicTable'));

  //   expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
  // });

  it('renders correctly with failures', () => {
    (useRuleStatus as jest.Mock).mockReturnValue([
      false,
      { failures: [{ last_failure_at: new Date().toISOString() }] },
    ]);
    const wrapper = shallow(<FailureHistory id="id" />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
  });

  it('renders correctly without failures', () => {
    (useRuleStatus as jest.Mock).mockReturnValue([
      false,
      {
        status: 'succeeded',
        last_failure_at: new Date().toISOString(),
        last_failure_message: 'my fake failure message',
        failures: [],
      },
    ]);
    const wrapper = shallow(<FailureHistory id="id" />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
  });

  it('renders incorrectly', () => {
    (useRuleStatus as jest.Mock).mockReturnValue([true, null]);
    const wrapper = shallow(<FailureHistory id="id" />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('EuiPanel')).toHaveLength(1);
  });
});
