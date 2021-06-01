/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';
import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiPageHeader } from '@elastic/eui';

import { RelevanceTuningLayout } from './relevance_tuning_layout';

describe('RelevanceTuningLayout', () => {
  const values = {
    engineHasSchemaFields: true,
    schemaFieldsWithConflicts: [],
  };

  const actions = {
    updateSearchSettings: jest.fn(),
    resetSearchSettings: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  const subject = () => shallow(<RelevanceTuningLayout />);
  const findButtons = (wrapper: ShallowWrapper) =>
    wrapper.find(EuiPageHeader).prop('rightSideItems') as React.ReactElement[];

  it('renders a Save button that will save the current changes', () => {
    const buttons = findButtons(subject());
    expect(buttons.length).toBe(2);
    const saveButton = shallow(buttons[0]);
    saveButton.simulate('click');
    expect(actions.updateSearchSettings).toHaveBeenCalled();
  });

  it('renders a Reset button that will remove all weights and boosts', () => {
    const buttons = findButtons(subject());
    expect(buttons.length).toBe(2);
    const resetButton = shallow(buttons[1]);
    resetButton.simulate('click');
    expect(actions.resetSearchSettings).toHaveBeenCalled();
  });

  it('will not render buttons if the engine has no schema', () => {
    setMockValues({
      ...values,
      engineHasSchemaFields: false,
    });
    const buttons = findButtons(subject());
    expect(buttons.length).toBe(0);
  });
});
