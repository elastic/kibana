/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { SourceIcon } from './';

describe('SourceIcon', () => {
  it('renders unwrapped icon', () => {
    const wrapper = shallow(<SourceIcon name="foo" serviceType="custom" />);

    expect(wrapper.find('img')).toHaveLength(1);
    expect(wrapper.find('.user-group-source')).toHaveLength(0);
  });

  it('renders wrapped icon', () => {
    const wrapper = shallow(<SourceIcon name="foo" wrapped serviceType="custom" />);

    expect(wrapper.find('.user-group-source')).toHaveLength(1);
  });
});
