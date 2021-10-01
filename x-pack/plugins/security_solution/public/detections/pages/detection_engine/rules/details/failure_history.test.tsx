/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { nextTick } from '@kbn/test/jest';

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
