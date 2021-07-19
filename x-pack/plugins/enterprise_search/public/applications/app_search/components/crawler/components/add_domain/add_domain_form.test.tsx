/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButton, EuiCode, EuiFieldText, EuiForm } from '@elastic/eui';

import { rerender } from '../../../../../test_helpers';

import { AddDomainForm } from './add_domain_form';

const MOCK_VALUES = {
  addDomainFormInputValue: 'https://',
  entryPointValue: '/',
};

const MOCK_ACTIONS = {
  setAddDomainFormInputValue: jest.fn(),
  validateDomain: jest.fn(),
};

describe('AddDomainForm', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(MOCK_ACTIONS);
    setMockValues(MOCK_VALUES);
    wrapper = shallow(<AddDomainForm />);
  });

  it('renders', () => {
    expect(wrapper.find(EuiForm)).toHaveLength(1);
  });

  it('contains a submit button', () => {
    expect(wrapper.find(EuiButton).prop('type')).toEqual('submit');
  });

  it('validates domain on submit', () => {
    wrapper.find(EuiForm).simulate('submit', { preventDefault: jest.fn() });

    expect(MOCK_ACTIONS.validateDomain).toHaveBeenCalledTimes(1);
  });

  describe('url field', () => {
    it('uses the value from the logic', () => {
      setMockValues({
        ...MOCK_VALUES,
        addDomainFormInputValue: 'test value',
      });

      rerender(wrapper);

      expect(wrapper.find(EuiFieldText).prop('value')).toEqual('test value');
    });

    it('sets the value in the logic on change', () => {
      wrapper.find(EuiFieldText).simulate('change', { target: { value: 'test value' } });

      expect(MOCK_ACTIONS.setAddDomainFormInputValue).toHaveBeenCalledWith('test value');
    });
  });

  describe('validate domain button', () => {
    it('is enabled when the input has a value', () => {
      setMockValues({
        ...MOCK_VALUES,
        addDomainFormInputValue: 'https://elastic.co',
      });

      rerender(wrapper);

      expect(wrapper.find(EuiButton).prop('disabled')).toEqual(false);
    });

    it('is disabled when the input value is empty', () => {
      setMockValues({
        ...MOCK_VALUES,
        addDomainFormInputValue: '',
      });

      rerender(wrapper);

      expect(wrapper.find(EuiButton).prop('disabled')).toEqual(true);
    });
  });

  describe('entry point indicator', () => {
    it('is hidden when the entry point is /', () => {
      setMockValues({
        ...MOCK_VALUES,
        entryPointValue: '/',
      });

      rerender(wrapper);

      expect(wrapper.find(EuiCode)).toHaveLength(0);
    });

    it('displays the entry point otherwise', () => {
      setMockValues({
        ...MOCK_VALUES,
        entryPointValue: '/guide',
      });

      rerender(wrapper);

      expect(wrapper.find(EuiCode)).toHaveLength(1);
    });
  });
});
