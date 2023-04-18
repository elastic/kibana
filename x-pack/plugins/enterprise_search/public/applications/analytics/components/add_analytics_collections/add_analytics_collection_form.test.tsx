/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldText, EuiForm, EuiFormRow } from '@elastic/eui';

import { AddAnalyticsCollectionForm } from './add_analytics_collection_form';

const mockValues = {
  canSubmit: true,
  inputError: false,
  isLoading: false,
  name: 'test',
};

const mockActions = {
  createAnalyticsCollection: jest.fn(),
  setNameValue: jest.fn(),
};

describe('AddAnalyticsCollectionForm', () => {
  const formId = 'addAnalyticsCollectionFormId';
  const collectionNameField = 'collectionNameField';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(
      <AddAnalyticsCollectionForm formId={formId} collectionNameField={collectionNameField} />
    );
    expect(wrapper.find(EuiForm)).toHaveLength(1);
  });

  it('submit form will call create analytics collection action', () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(
      <AddAnalyticsCollectionForm formId={formId} collectionNameField={collectionNameField} />
    );

    wrapper.find(EuiForm).simulate('submit', { preventDefault: jest.fn() });
    expect(mockActions.createAnalyticsCollection).toHaveBeenCalled();
  });

  it('cannot call createAnalyticsCollection when form has errors', () => {
    setMockValues({
      ...mockValues,
      canSubmit: false,
    });
    setMockActions(mockActions);

    const wrapper = shallow(
      <AddAnalyticsCollectionForm formId={formId} collectionNameField={collectionNameField} />
    );

    wrapper.find(EuiForm).simulate('submit', { preventDefault: jest.fn() });
    expect(mockActions.createAnalyticsCollection).not.toHaveBeenCalled();
  });

  it('should call setNameValue action when input is updated', () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(
      <AddAnalyticsCollectionForm formId={formId} collectionNameField={collectionNameField} />
    );

    wrapper.find(EuiFieldText).simulate('change', { target: { value: 'test' } });
    expect(mockActions.setNameValue).toHaveBeenCalledWith('test');
  });

  it('should show error when input error exists', () => {
    const inputErrorMock = 'Already exists';
    setMockValues({
      ...mockValues,
      inputError: inputErrorMock,
    });
    setMockActions(mockActions);

    const wrapper = shallow(
      <AddAnalyticsCollectionForm formId={formId} collectionNameField={collectionNameField} />
    );
    expect(wrapper.find(EuiFormRow).prop('error')).toEqual(inputErrorMock);
    expect(wrapper.find(EuiFormRow).prop('isInvalid')).toBeTruthy();
    expect(wrapper.find(EuiFieldText).prop('isInvalid')).toBeTruthy();
  });
});
