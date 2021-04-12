/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../__mocks__';

import React from 'react';

import { shallow } from 'enzyme';

import { ResultSettings } from './result_settings';
import { ResultSettingsTable } from './result_settings_table';
import { SampleResponse } from './sample_response';

describe('RelevanceTuning', () => {
  const values = {
    dataLoading: false,
  };

  const actions = {
    initializeResultSettingsData: jest.fn(),
  };

  beforeEach(() => {
    setMockValues(values);
    setMockActions(actions);
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<ResultSettings engineBreadcrumb={['test']} />);
    expect(wrapper.find(ResultSettingsTable).exists()).toBe(true);
    expect(wrapper.find(SampleResponse).exists()).toBe(true);
  });

  it('initializes result settings data when mounted', () => {
    shallow(<ResultSettings engineBreadcrumb={['test']} />);
    expect(actions.initializeResultSettingsData).toHaveBeenCalled();
  });

  it('renders a loading screen if data has not loaded yet', () => {
    setMockValues({
      dataLoading: true,
    });
    const wrapper = shallow(<ResultSettings engineBreadcrumb={['test']} />);
    expect(wrapper.find(ResultSettingsTable).exists()).toBe(false);
    expect(wrapper.find(SampleResponse).exists()).toBe(false);
  });
});
