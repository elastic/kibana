/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions, mockKibanaValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonEmpty, EuiFieldText, EuiForm } from '@elastic/eui';

import { AddAnalyticsCollectionForm } from './add_analytics_collection_form';

const mockValues = {
  canSubmit: true,
  hasInputError: false,
  inputError: false,
  isLoading: false,
  name: 'test',
};

const mockActions = {
  createAnalyticsCollection: jest.fn(),
  setNameValue: jest.fn(),
};

describe('AddAnalyticsCollectionForm', () => {
  const { navigateToUrl } = mockKibanaValues;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(<AddAnalyticsCollectionForm />);
    expect(wrapper.find(EuiForm)).toHaveLength(1);
  });

  it('navigates back to root when cancel is clicked', () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(<AddAnalyticsCollectionForm />);

    wrapper.find(EuiButtonEmpty).simulate('click');
    expect(navigateToUrl).toHaveBeenCalledWith('/');
  });

  it('submit form will call create analytics collection action', () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(<AddAnalyticsCollectionForm />);

    wrapper.find(EuiForm).simulate('submit', { preventDefault: jest.fn() });
    expect(mockActions.createAnalyticsCollection).toHaveBeenCalled();
  });

  it('cannot call createAnalyticsCollection when form has errors', () => {
    setMockValues({
      ...mockValues,
      canSubmit: false,
      hasInputError: true,
    });
    setMockActions(mockActions);

    const wrapper = shallow(<AddAnalyticsCollectionForm />);

    wrapper.find(EuiForm).simulate('submit', { preventDefault: jest.fn() });
    expect(mockActions.createAnalyticsCollection).not.toHaveBeenCalled();
  });

  it('should call setNameValue action when input is updated', () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(<AddAnalyticsCollectionForm />);

    wrapper.find(EuiFieldText).simulate('change', { target: { value: 'test' } });
    expect(mockActions.setNameValue).toHaveBeenCalledWith('test');
  });
});
