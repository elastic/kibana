/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonTo } from '../react_router_helpers';

import { AddRoleMappingButton } from './add_role_mapping_button';

describe('AddRoleMappingButton', () => {
  it('renders', () => {
    const wrapper = shallow(<AddRoleMappingButton path="/foo" />);

    expect(wrapper.find(EuiButtonTo)).toHaveLength(1);
  });
});
