/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiLoadingSpinner, EuiTextColor } from '@elastic/eui';

import { ComponentLoader } from '.';

describe('ComponentLoader', () => {
  it('renders', () => {
    const wrapper = shallow(<ComponentLoader />);

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);
    expect(wrapper.find(EuiTextColor)).toHaveLength(1);
    expect(wrapper.find(EuiTextColor).prop('children')).toEqual('Loading...');
  });
});
