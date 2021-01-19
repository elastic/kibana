/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiFieldText } from '@elastic/eui';

import { ContentSection } from '../../../components/shared/content_section';

import { Customize } from './customize';

describe('Customize', () => {
  const onOrgNameInputChange = jest.fn();
  const updateOrgName = jest.fn();

  beforeEach(() => {
    setMockActions({ onOrgNameInputChange, updateOrgName });
    setMockValues({ orgNameInputValue: '' });
  });

  it('renders', () => {
    const wrapper = shallow(<Customize />);

    expect(wrapper.find(ContentSection)).toHaveLength(1);
  });

  it('handles input change', () => {
    const wrapper = shallow(<Customize />);
    const input = wrapper.find(EuiFieldText);
    input.simulate('change', { target: { value: 'foobar' } });

    expect(onOrgNameInputChange).toHaveBeenCalledWith('foobar');
  });

  it('handles form submission', () => {
    const wrapper = shallow(<Customize />);
    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(updateOrgName).toHaveBeenCalled();
  });
});
