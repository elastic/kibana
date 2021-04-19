/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { shallow } from 'enzyme';

import { RoleMapping } from './role_mapping';
import { RoleMappings } from './role_mappings';
import { RoleMappingsRouter } from './role_mappings_router';

describe('RoleMappingsRouter', () => {
  it('renders', () => {
    const wrapper = shallow(<RoleMappingsRouter />);

    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(3);
    expect(wrapper.find(RoleMapping)).toHaveLength(2);
    expect(wrapper.find(RoleMappings)).toHaveLength(1);
  });
});
