/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../__mocks__';
import '../../../__mocks__/shallow_useeffect.mock';
import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiPageHeader } from '@elastic/eui';

import { ResultSettings } from './result_settings';
import { ResultSettingsTable } from './result_settings_table';
import { SampleResponse } from './sample_response';

describe('RelevanceTuning', () => {
  const values = {
    dataLoading: false,
  };

  const actions = {
    initializeResultSettingsData: jest.fn(),
    saveResultSettings: jest.fn(),
    confirmResetAllFields: jest.fn(),
    clearAllFields: jest.fn(),
  };

  beforeEach(() => {
    setMockValues(values);
    setMockActions(actions);
    jest.clearAllMocks();
  });

  const subject = () => shallow(<ResultSettings />);
  const findButtons = (wrapper: ShallowWrapper) =>
    wrapper.find(EuiPageHeader).prop('rightSideItems') as React.ReactElement[];

  it('renders', () => {
    const wrapper = subject();
    expect(wrapper.find(ResultSettingsTable).exists()).toBe(true);
    expect(wrapper.find(SampleResponse).exists()).toBe(true);
  });

  it('initializes result settings data when mounted', () => {
    shallow(<ResultSettings />);
    expect(actions.initializeResultSettingsData).toHaveBeenCalled();
  });

  it('renders a loading screen if data has not loaded yet', () => {
    setMockValues({
      dataLoading: true,
    });
    const wrapper = subject();
    expect(wrapper.find(ResultSettingsTable).exists()).toBe(false);
    expect(wrapper.find(SampleResponse).exists()).toBe(false);
  });

  it('renders a "save" button that will save the current changes', () => {
    const buttons = findButtons(subject());
    expect(buttons.length).toBe(3);
    const saveButton = shallow(buttons[0]);
    saveButton.simulate('click');
    expect(actions.saveResultSettings).toHaveBeenCalled();
  });

  it('renders a "restore defaults" button that will reset all values to their defaults', () => {
    const buttons = findButtons(subject());
    expect(buttons.length).toBe(3);
    const resetButton = shallow(buttons[1]);
    resetButton.simulate('click');
    expect(actions.confirmResetAllFields).toHaveBeenCalled();
  });

  it('renders a "clear" button that will remove all selected options', () => {
    const buttons = findButtons(subject());
    expect(buttons.length).toBe(3);
    const clearButton = shallow(buttons[2]);
    clearButton.simulate('click');
    expect(actions.clearAllFields).toHaveBeenCalled();
  });
});
