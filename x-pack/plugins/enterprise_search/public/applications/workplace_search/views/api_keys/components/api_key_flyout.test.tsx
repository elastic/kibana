/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlyout, EuiForm, EuiFieldText, EuiFormRow } from '@elastic/eui';

import { ApiKeyFlyout } from './api_key_flyout';

describe('ApiKeyFlyout', () => {
  const setNameInputBlurred = jest.fn();
  const setApiKeyName = jest.fn();
  const onApiFormSubmit = jest.fn();
  const hideApiKeyForm = jest.fn();

  const apiKey = {
    id: '123',
    name: 'test',
  };

  const values = {
    activeApiToken: apiKey,
  };

  beforeEach(() => {
    setMockValues(values);
    setMockActions({
      setNameInputBlurred,
      setApiKeyName,
      onApiFormSubmit,
      hideApiKeyForm,
    });
  });

  it('renders', () => {
    const wrapper = shallow(<ApiKeyFlyout />);
    const flyout = wrapper.find(EuiFlyout);

    expect(flyout).toHaveLength(1);
    expect(flyout.prop('onClose')).toEqual(hideApiKeyForm);
  });

  it('calls onApiTokenChange on form submit', () => {
    const wrapper = shallow(<ApiKeyFlyout />);
    const preventDefault = jest.fn();
    wrapper.find(EuiForm).simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(onApiFormSubmit).toHaveBeenCalled();
  });

  it('shows help text if the raw name does not match the expected name', () => {
    setMockValues({
      ...values,
      activeApiToken: { name: 'my-api-key' },
      activeApiTokenRawName: 'my api key!!',
    });
    const wrapper = shallow(<ApiKeyFlyout />);

    expect(wrapper.find(EuiFormRow).prop('helpText')).toEqual('Your key will be named: my-api-key');
  });

  it('controls the input value', () => {
    setMockValues({
      ...values,
      activeApiTokenRawName: 'test',
    });
    const wrapper = shallow(<ApiKeyFlyout />);

    expect(wrapper.find(EuiFieldText).prop('value')).toEqual('test');
  });

  it('calls setApiKeyName when the input value is changed', () => {
    const wrapper = shallow(<ApiKeyFlyout />);
    wrapper.find(EuiFieldText).simulate('change', { target: { value: 'changed' } });

    expect(setApiKeyName).toHaveBeenCalledWith('changed');
  });

  it('calls setNameInputBlurred when the user stops focusing the input', () => {
    const wrapper = shallow(<ApiKeyFlyout />);
    wrapper.find(EuiFieldText).simulate('blur');

    expect(setNameInputBlurred).toHaveBeenCalledWith(true);
  });
});
