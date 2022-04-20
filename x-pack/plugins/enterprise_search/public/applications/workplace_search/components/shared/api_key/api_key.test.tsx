/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCodeBlock, EuiFormLabel } from '@elastic/eui';

import { ApiKey } from '.';

const key = '123abc';
const label = 'foo';

describe('ApiKey', () => {
  it('renders', () => {
    const wrapper = shallow(<ApiKey apiKey={key} />);

    expect(wrapper.find(EuiCodeBlock)).toHaveLength(1);
    expect(wrapper.find(EuiFormLabel)).toHaveLength(0);
    expect(wrapper.find(EuiCodeBlock).prop('children')).toEqual(key);
  });

  it('renders label', () => {
    const wrapper = shallow(<ApiKey apiKey={key} label={label} />);

    expect(wrapper.find(EuiFormLabel)).toHaveLength(1);
    expect(wrapper.find(EuiFormLabel).prop('children')).toEqual(label);
  });
});
