/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__/kea.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiPageHeader } from '@elastic/eui';

import { RelevanceTuning } from './relevance_tuning';
import { RelevanceTuningForm } from './relevance_tuning_form';

describe('RelevanceTuning', () => {
  const values = {
    engineHasSchemaFields: true,
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
    expect(subject().find(RelevanceTuningForm).exists()).toBe(true);
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

  it('renders a Reset button that will reset the current changes', () => {
    const buttons = subject().find(EuiPageHeader).prop('rightSideItems') as React.ReactElement[];
    expect(buttons.length).toBe(2);
    const resetButton = shallow(buttons[1]);
    resetButton.simulate('click');
    expect(actions.resetSearchSettings).toHaveBeenCalled();
  });

  it('will not render buttons if the engine has no schema', () => {
    setMockValues({
      engineHasSchemaFields: false,
    });
    const buttons = subject().find(EuiPageHeader).prop('rightSideItems') as React.ReactElement[];
    expect(buttons.length).toBe(0);
  });
});
