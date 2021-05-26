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

import { UnsavedChangesPrompt } from '../../../shared/unsaved_changes_prompt';

import { EmptyState } from './components';
import { ResultSettings } from './result_settings';
import { ResultSettingsTable } from './result_settings_table';
import { SampleResponse } from './sample_response';

describe('ResultSettings', () => {
  const values = {
    schema: {
      foo: 'text',
    },
    dataLoading: false,
    stagedUpdates: true,
    resultFieldsAtDefaultSettings: false,
  };

  const actions = {
    initializeResultSettingsData: jest.fn(),
    saveResultSettings: jest.fn(),
    confirmResetAllFields: jest.fn(),
    clearAllFields: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
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

  it('renders the "save" button as disabled if the user has made no changes since the page loaded', () => {
    setMockValues({
      ...values,
      stagedUpdates: false,
    });
    const buttons = findButtons(subject());
    const saveButton = shallow(buttons[0]);
    expect(saveButton.prop('disabled')).toBe(true);
  });

  it('renders the "save" button as disabled if everything is disabled', () => {
    setMockValues({
      ...values,
      stagedUpdates: true,
      resultFieldsEmpty: true,
    });
    const buttons = findButtons(subject());
    const saveButton = shallow(buttons[0]);
    expect(saveButton.prop('disabled')).toBe(true);
  });

  it('renders a "restore defaults" button that will reset all values to their defaults', () => {
    const buttons = findButtons(subject());
    expect(buttons.length).toBe(3);
    const resetButton = shallow(buttons[1]);
    resetButton.simulate('click');
    expect(actions.confirmResetAllFields).toHaveBeenCalled();
  });

  it('renders the "restore defaults" button as disabled if the values are already at their defaults', () => {
    setMockValues({
      ...values,
      resultFieldsAtDefaultSettings: true,
    });
    const buttons = findButtons(subject());
    const resetButton = shallow(buttons[1]);
    expect(resetButton.prop('disabled')).toBe(true);
  });

  it('renders a "clear" button that will remove all selected options', () => {
    const buttons = findButtons(subject());
    expect(buttons.length).toBe(3);
    const clearButton = shallow(buttons[2]);
    clearButton.simulate('click');
    expect(actions.clearAllFields).toHaveBeenCalled();
  });

  it('will prevent user from leaving the page if there are unsaved changes', () => {
    setMockValues({
      ...values,
      stagedUpdates: true,
    });
    expect(subject().find(UnsavedChangesPrompt).prop('hasUnsavedChanges')).toBe(true);
  });

  describe('when there is no schema yet', () => {
    let wrapper: ShallowWrapper;
    beforeAll(() => {
      setMockValues({
        ...values,
        schema: {},
      });
      wrapper = subject();
    });

    it('will not render action buttons', () => {
      const buttons = findButtons(wrapper);
      expect(buttons.length).toBe(0);
    });

    it('will not render the main page content', () => {
      expect(wrapper.find(ResultSettingsTable).exists()).toBe(false);
      expect(wrapper.find(SampleResponse).exists()).toBe(false);
    });

    it('will render an empty state', () => {
      expect(wrapper.find(EmptyState).exists()).toBe(true);
    });
  });
});
