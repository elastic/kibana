/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiTitle, EuiLink, EuiButton, EuiText } from '@elastic/eui';

import { RoleMappingsHeading } from './role_mappings_heading';

describe('RoleMappingsHeading', () => {
  it('renders ', () => {
    const wrapper = shallow(<RoleMappingsHeading productName="App Search" onClick={jest.fn()} />);

    expect(wrapper.find(EuiTitle)).toHaveLength(1);
    expect(wrapper.find(EuiText)).toHaveLength(1);
    expect(wrapper.find(EuiLink)).toHaveLength(1);
    expect(wrapper.find(EuiButton)).toHaveLength(1);
  });
});
