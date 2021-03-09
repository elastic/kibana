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

import { EuiEmptyPrompt } from '@elastic/eui';

import { Loading } from '../../../shared/loading';
import { UnsavedChangesPrompt } from '../../../shared/unsaved_changes_prompt';

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
    unsavedChanges: false,
    dataLoading: false,
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
    expect(wrapper.find(Loading).exists()).toBe(false);
    expect(wrapper.find('EmptyCallout').exists()).toBe(false);
  });

  it('initializes relevance tuning data', () => {
    subject();
    expect(actions.initializeRelevanceTuning).toHaveBeenCalled();
  });

  it('will render an empty message when the engine has no schema', () => {
    setMockValues({
      ...values,
      engineHasSchemaFields: false,
    });
    const wrapper = subject();
    expect(wrapper.find('EmptyCallout').dive().find(EuiEmptyPrompt).exists()).toBe(true);
    expect(wrapper.find(Loading).exists()).toBe(false);
    expect(wrapper.find(RelevanceTuningForm).exists()).toBe(false);
  });

  it('will show a loading message if data is loading', () => {
    setMockValues({
      ...values,
      dataLoading: true,
    });
    const wrapper = subject();
    expect(wrapper.find(Loading).exists()).toBe(true);
    expect(wrapper.find('EmptyCallout').exists()).toBe(false);
    expect(wrapper.find(RelevanceTuningForm).exists()).toBe(false);
  });

  it('will prevent user from leaving the page if there are unsaved changes', () => {
    setMockValues({
      ...values,
      unsavedChanges: true,
    });
    expect(subject().find(UnsavedChangesPrompt).prop('hasUnsavedChanges')).toBe(true);
  });
});
