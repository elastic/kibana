/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiText, EuiSpacer } from '@elastic/eui';

import { RoleOptionLabel } from './role_option_label';

describe('RoleOptionLabel', () => {
  it('renders with capitalized label ', () => {
    const wrapper = shallow(<RoleOptionLabel label="foO" description="bar" />);

    expect(wrapper.find(EuiText)).toHaveLength(2);
    expect(wrapper.find(EuiText).first().prop('children')).toBe('Foo');
    expect(wrapper.find(EuiSpacer)).toHaveLength(2);
  });
});
