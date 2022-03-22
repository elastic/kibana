/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiForm, EuiFieldText } from '@elastic/eui';

import { staticSourceData } from '../../../source_data';

import { ConfigureCustom } from './configure_custom';

describe('ConfigureCustom', () => {
  const setCustomSourceNameValue = jest.fn();
  const createContentSource = jest.fn();

  beforeEach(() => {
    setMockActions({ setCustomSourceNameValue, createContentSource });
    setMockValues({
      customSourceNameValue: 'name',
      buttonLoading: false,
      sourceData: staticSourceData[1],
    });
  });

  it('renders', () => {
    const wrapper = shallow(<ConfigureCustom />);

    expect(wrapper.find(EuiForm)).toHaveLength(1);
  });

  it('handles input change', () => {
    const wrapper = shallow(<ConfigureCustom />);
    const text = 'changed for the better';
    const input = wrapper.find(EuiFieldText);
    input.simulate('change', { target: { value: text } });

    expect(setCustomSourceNameValue).toHaveBeenCalledWith(text);
  });

  it('handles form submission', () => {
    const wrapper = shallow(<ConfigureCustom />);

    const preventDefault = jest.fn();
    wrapper.find('EuiForm').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(createContentSource).toHaveBeenCalled();
  });
});
