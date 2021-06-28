/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton, EuiLink, EuiEmptyPrompt } from '@elastic/eui';

import { RolesEmptyPrompt } from './roles_empty_prompt';

describe('RolesEmptyPrompt', () => {
  const onEnable = jest.fn();

  const props = {
    productName: 'App Search',
    docsLink: 'http://elastic.co',
    onEnable,
  };

  it('renders', () => {
    const wrapper = shallow(<RolesEmptyPrompt {...props} />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(wrapper.find(EuiEmptyPrompt).dive().find(EuiLink).prop('href')).toEqual(props.docsLink);
  });

  it('calls onEnable on change', () => {
    const wrapper = shallow(<RolesEmptyPrompt {...props} />);
    const prompt = wrapper.find(EuiEmptyPrompt).dive();
    prompt.find(EuiButton).simulate('click');

    expect(onEnable).toHaveBeenCalled();
  });
});
