/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';
import '../../../__mocks__/shallow_useeffect.mock';
import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { UnsavedChangesPrompt } from '../../../shared/unsaved_changes_prompt';
import { getPageHeaderActions } from '../../../test_helpers';

import { PrecisionSlider } from './components/precision_slider';
import { RelevanceTuning } from './relevance_tuning';

import { RelevanceTuningCallouts } from './relevance_tuning_callouts';
import { RelevanceTuningForm } from './relevance_tuning_form';
import { RelevanceTuningPreview } from './relevance_tuning_preview';

describe('RelevanceTuning', () => {
  const values = {
    engineHasSchemaFields: true,
    engine: {
      invalidBoosts: false,
      unsearchedUnconfirmedFields: false,
    },
    schemaFieldsWithConflicts: [],
    unsavedChanges: false,
    dataLoading: false,
  };

  const actions = {
    initializeRelevanceTuning: jest.fn(),
    updateSearchSettings: jest.fn(),
    resetSearchSettings: jest.fn(),
  };

  const subject = () => shallow(<RelevanceTuning />);

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = subject();
    expect(wrapper.find(RelevanceTuningCallouts).exists()).toBe(true);
    expect(wrapper.find(PrecisionSlider).exists()).toBe(true);
    expect(wrapper.find(RelevanceTuningForm).exists()).toBe(true);
    expect(wrapper.find(RelevanceTuningPreview).exists()).toBe(true);
  });

  it('initializes relevance tuning data', () => {
    subject();
    expect(actions.initializeRelevanceTuning).toHaveBeenCalled();
  });

  it('will prevent user from leaving the page if there are unsaved changes', () => {
    setMockValues({
      ...values,
      unsavedChanges: true,
    });
    expect(subject().find(UnsavedChangesPrompt).prop('hasUnsavedChanges')).toBe(true);
  });

  describe('header actions', () => {
    it('renders a Save button that will save the current changes', () => {
      const buttons = getPageHeaderActions(subject());
      expect(buttons.children().length).toBe(2);
      const saveButton = buttons.find('[data-test-subj="SaveRelevanceTuning"]');
      saveButton.simulate('click');
      expect(actions.updateSearchSettings).toHaveBeenCalled();
    });

    it('renders a Reset button that will remove all weights and boosts', () => {
      const buttons = getPageHeaderActions(subject());
      expect(buttons.children().length).toBe(2);
      const resetButton = buttons.find('[data-test-subj="ResetRelevanceTuning"]');
      resetButton.simulate('click');
      expect(actions.resetSearchSettings).toHaveBeenCalled();
    });

    it('will not render buttons if the engine has no schema', () => {
      setMockValues({
        ...values,
        engineHasSchemaFields: false,
      });
      const buttons = getPageHeaderActions(subject());
      expect(buttons.children().length).toBe(0);
    });
  });

  it('will not render the PrecisionSlider for elasticsearch engines', () => {
    setMockValues({
      ...values,
      isElasticsearchEngine: true,
    });

    expect(subject().find(PrecisionSlider).exists()).toBe(false);
  });
});
