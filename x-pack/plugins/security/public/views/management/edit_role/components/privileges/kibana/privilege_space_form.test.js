/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { PrivilegeSpaceForm } from './privilege_space_form';
import { RoleValidator } from '../../../lib/validate_role';

const buildProps = (customProps) => {
  return {
    availableSpaces: [{
      id: 'default',
      name: 'Default Space',
      _reserved: true
    }, {
      id: 'marketing',
      name: 'Marketing'
    }],
    selectedSpaceIds: [],
    availablePrivileges: ['all', 'read'],
    onChange: jest.fn(),
    onDelete: jest.fn(),
    validator: new RoleValidator(),
    ...customProps
  };
};

describe('<PrivilegeSpaceForm>', () => {
  it('renders without crashing', () => {
    expect(shallow(<PrivilegeSpaceForm {...buildProps()} />)).toMatchSnapshot();
  });
});
