/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__/kea.mock';

 import '../../__mocks__/engine_logic.mock'; 

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiEmptyPrompt, EuiPageHeader } from '@elastic/eui';

import { RelevanceTuning } from './relevance_tuning';
import { RelevanceTuningForm } from './relevance_tuning_form';

describe('RelevanceTuning', () => {
  const values = {
    engineHasSchemaFields: true,
    engine: {
      invalidBoosts: false,
      unsearchedUnconfirmedFields: false,
    },
    schemaFieldsWithConflicts: [],
  };

  const actions = {
    initializeRelevanceTuning: jest.fn(),
    updateSearchSettings: jest.fn(),
    resetSearchSettings: jest.fn(),
  };

  const subject = () => shallow(<RelevanceTuning engineBreadcrumb={['test']} />);

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = subject();
    expect(wrapper.find(RelevanceTuningForm).exists()).toBe(true);
    expect(wrapper.find('[data-test-subj="RelevanceTuningInvalidBoostsCallout"]').exists()).toBe(
      false
    );
    expect(wrapper.find('[data-test-subj="RelevanceTuningUnsearchedFieldsCallout"]').exists()).toBe(
      false
    );
    expect(subject().find('[data-test-subj="SchemaConflictsCallout"]').exists()).toBe(false);
  });

  it('initializes relevance tuning data', () => {
    subject();
    expect(actions.initializeRelevanceTuning).toHaveBeenCalled();
  });

  it('renders a Save button that will save the current changes', () => {
    const buttons = subject().find(EuiPageHeader).prop('rightSideItems') as React.ReactElement[];
    expect(buttons.length).toBe(2);
    const saveButton = shallow(buttons[0]);
    saveButton.simulate('click');
    expect(actions.updateSearchSettings).toHaveBeenCalled();
  });

  it('renders a Reset button that will remove all weights and boosts', () => {
    const buttons = subject().find(EuiPageHeader).prop('rightSideItems') as React.ReactElement[];
    expect(buttons.length).toBe(2);
    const resetButton = shallow(buttons[1]);
    resetButton.simulate('click');
    expect(actions.resetSearchSettings).toHaveBeenCalled();
  });

  describe('when the engine has no schema', () => {
    let wrapper: ShallowWrapper;

    beforeAll(() => {
      // An engine would have no schema if it is newly created, and no documents have been indexed
      // yet.
      setMockValues({
        ...values,
        engineHasSchemaFields: false,
      });
      wrapper = subject();
    });

    it('will not render buttons if the engine has no schema', () => {
      setMockValues({
        ...values,
        engineHasSchemaFields: false,
      });
      const buttons = wrapper.find(EuiPageHeader).prop('rightSideItems') as React.ReactElement[];
      expect(buttons.length).toBe(0);
    });

    it('will render an empty message', () => {
      setMockValues({
        ...values,
        engineHasSchemaFields: false,
      });
      expect(wrapper.find(EuiEmptyPrompt).exists()).toBe(true);
      expect(wrapper.find(RelevanceTuningForm).exists()).toBe(false);
    });
  });

  it('shows a message when there are invalid boosts', () => {
    // An invalid boost would be if a user creats a functional boost on a number field, then that
    // field later changes to text. At this point, the boost still exists but is invalid for
    // a text field.
    setMockValues({
      ...values,
      engine: {
        invalidBoosts: true,
        unsearchedUnconfirmedFields: false,
      },
    });
    expect(subject().find('[data-test-subj="RelevanceTuningInvalidBoostsCallout"]').exists()).toBe(
      true
    );
  });

  it('shows a message when there are unconfirmed fields', () => {
    // An invalid boost would be if a user creats a functional boost on a number field, then that
    // field later changes to text. At this point, the boost still exists but is invalid for
    // a text field.
    setMockValues({
      ...values,
      engine: {
        invalidBoosts: false,
        unsearchedUnconfirmedFields: true,
      },
    });
    expect(
      subject().find('[data-test-subj="RelevanceTuningUnsearchedFieldsCallout"]').exists()
    ).toBe(true);
  });

  it('shows a message when there are schema field conflicts', () => {
    // Schema conflicts occur when a meta engine has fields in source engines with have differing types,
    // hence relevance tuning cannot be applied as we don't know the actual type
    setMockValues({
      ...values,
      schemaFieldsWithConflicts: ['fe', 'fi', 'fo'],
    });
    expect(subject().find('[data-test-subj="SchemaConflictsCallout"]').exists()).toBe(true);
  });
});
