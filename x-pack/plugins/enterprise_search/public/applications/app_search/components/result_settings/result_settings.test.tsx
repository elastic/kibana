/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockActions } from '../../../__mocks__';

import React from 'react';

import { shallow } from 'enzyme';

import { ResultSettings } from './result_settings';
import { ResultSettingsTable } from './result_settings_table';

describe('RelevanceTuning', () => {
  const actions = {
    initializeResultSettingsData: jest.fn(),
  };
  beforeEach(() => {
    setMockActions(actions);
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<ResultSettings engineBreadcrumb={['test']} />);
    expect(wrapper.find(ResultSettingsTable).exists()).toBe(true);
  });

  it('initializes result settings data when mounted', () => {
    shallow(<ResultSettings engineBreadcrumb={['test']} />);
    expect(actions.initializeResultSettingsData).toHaveBeenCalled();
  });
});
