/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { FormLabel } from './form_label';

describe('FormLabel', () => {

  test('Basic initialization', () => {
    const wrapper = shallow(<FormLabel />);
    const props = wrapper.props();
    expect(props.labelId).toBeUndefined();
    expect(wrapper.find('label').text()).toBe('');
    expect(wrapper).toMatchSnapshot();
  });

  test('Full initialization', () => {
    const labelId = 'uid';
    const labelText = 'Label Text';
    const wrapper = shallow(<FormLabel labelId={labelId}>{labelText}</FormLabel>);

    const labelElement = wrapper.find('label');
    expect(labelElement.props().id).toBe(`ml_aria_label_${labelId}`);
    expect(labelElement.text()).toBe(labelText);
    expect(wrapper).toMatchSnapshot();
  });
});
