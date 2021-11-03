/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';
import '../../../__mocks__/shallow_useeffect.mock';
import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { UnsavedChangesPrompt } from '../../../shared/unsaved_changes_prompt';
import { getPageHeaderActions } from '../../../test_helpers';

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

  it('renders', () => {
    const wrapper = subject();
    expect(wrapper.find(ResultSettingsTable).exists()).toBe(true);
    expect(wrapper.find(SampleResponse).exists()).toBe(true);
  });

  it('initializes result settings data when mounted', () => {
    shallow(<ResultSettings />);
    expect(actions.initializeResultSettingsData).toHaveBeenCalled();
  });

  it('renders a "save" button that will save the current changes', () => {
    const buttons = getPageHeaderActions(subject());
    expect(buttons.children().length).toBe(3);
    const saveButton = buttons.find('[data-test-subj="SaveResultSettings"]');
    saveButton.simulate('click');
    expect(actions.saveResultSettings).toHaveBeenCalled();
  });

  it('renders the "save" button as disabled if the user has made no changes since the page loaded', () => {
    setMockValues({
      ...values,
      stagedUpdates: false,
    });
    const buttons = getPageHeaderActions(subject());
    const saveButton = buttons.find('[data-test-subj="SaveResultSettings"]');
    expect(saveButton.prop('disabled')).toBe(true);
  });

  it('renders the "save" button as disabled if everything is disabled', () => {
    setMockValues({
      ...values,
      stagedUpdates: true,
      resultFieldsEmpty: true,
    });
    const buttons = getPageHeaderActions(subject());
    const saveButton = buttons.find('[data-test-subj="SaveResultSettings"]');
    expect(saveButton.prop('disabled')).toBe(true);
  });

  it('renders a "restore defaults" button that will reset all values to their defaults', () => {
    const buttons = getPageHeaderActions(subject());
    expect(buttons.children().length).toBe(3);
    const resetButton = buttons.find('[data-test-subj="ResetResultSettings"]');
    resetButton.simulate('click');
    expect(actions.confirmResetAllFields).toHaveBeenCalled();
  });

  it('renders the "restore defaults" button as disabled if the values are already at their defaults', () => {
    setMockValues({
      ...values,
      resultFieldsAtDefaultSettings: true,
    });
    const buttons = getPageHeaderActions(subject());
    const resetButton = buttons.find('[data-test-subj="ResetResultSettings"]');
    expect(resetButton.prop('disabled')).toBe(true);
  });

  it('renders a "clear" button that will remove all selected options', () => {
    const buttons = getPageHeaderActions(subject());
    expect(buttons.children().length).toBe(3);
    const clearButton = buttons.find('[data-test-subj="ClearResultSettings"]');
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
      const buttons = getPageHeaderActions(wrapper);
      expect(buttons.children().length).toBe(0);
    });

    it('will render an empty state', () => {
      expect(wrapper.prop('isEmptyState')).toBe(true);
    });
  });
});
