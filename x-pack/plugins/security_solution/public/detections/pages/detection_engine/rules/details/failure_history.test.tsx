/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { TestProviders } from '../../../../../common/mock';
import { FailureHistory } from './failure_history';
import { useRuleStatus } from '../../../../containers/detection_engine/rules';
jest.mock('../../../../containers/detection_engine/rules');

describe('FailureHistory', () => {
  beforeAll(() => {
    (useRuleStatus as jest.Mock).mockReturnValue([false, null]);
  });

  it('renders correctly', () => {
    const wrapper = shallow(<FailureHistory id="id" />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
  });
});
