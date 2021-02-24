/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiIcon } from '@elastic/eui';

import { SourceIcon } from './';

describe('SourceIcon', () => {
  it('renders unwrapped icon', () => {
    const wrapper = shallow(<SourceIcon name="foo" serviceType="custom" />);

    expect(wrapper.find(EuiIcon)).toHaveLength(1);
    expect(wrapper.find('.user-group-source')).toHaveLength(0);
  });

  it('renders wrapped icon', () => {
    const wrapper = shallow(<SourceIcon name="foo" wrapped serviceType="custom" />);

    expect(wrapper.find('.wrapped-icon')).toHaveLength(1);
  });

  it('renders a full bleed icon', () => {
    const wrapper = shallow(<SourceIcon name="foo" fullBleed serviceType="custom" />);

    expect(wrapper.find(EuiIcon).prop('type')).toEqual('test-file-stub');
  });
});
