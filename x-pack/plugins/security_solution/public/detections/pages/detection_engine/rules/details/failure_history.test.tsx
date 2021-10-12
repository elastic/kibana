/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import {
  TestProviders,
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../../../common/mock';
import { FailureHistory } from './failure_history';
import { useRuleStatus } from '../../../../containers/detection_engine/rules';
jest.mock('../../../../containers/detection_engine/rules');

import { waitFor } from '@testing-library/react';

import '../../../../../common/mock/match_media';

import { createStore, State } from '../../../../../common/store';
import { mockHistory, Router } from '../../../../../common/mock/router';

const state: State = {
  ...mockGlobalState,
};
const { storage } = createSecuritySolutionStorageMock();
const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

describe('RuleDetailsPageComponent', () => {
  beforeAll(() => {
    (useRuleStatus as jest.Mock).mockReturnValue([
      false,
      {
        status: 'succeeded',
        last_failure_at: new Date().toISOString(),
        last_failure_message: 'my fake failure message',
        failures: [
          {
            alert_id: 'myfakeid',
            status_date: new Date().toISOString(),
            status: 'failed',
            last_failure_at: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            last_failure_message: 'my fake failure message',
            last_look_back_date: new Date().toISOString(), // NOTE: This is no longer used on the UI, but left here in case users are using it within the API
          },
        ],
      },
    ]);
  });

  it('renders reported rule failures correctly', async () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Router history={mockHistory}>
          <FailureHistory id="id" />
        </Router>
      </TestProviders>
    );

    await waitFor(() => {
      expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
      // ensure the expected error message is displayed in the table
      expect(wrapper.find('EuiTableRowCell').at(2).find('div').at(1).text()).toEqual(
        'my fake failure message'
      );
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
});
