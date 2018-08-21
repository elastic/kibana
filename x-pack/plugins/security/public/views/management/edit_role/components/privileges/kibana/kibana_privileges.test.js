/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { KibanaPrivileges } from './kibana_privileges';
import { SimplePrivilegeForm } from './simple_privilege_form';
import { SpaceAwarePrivilegeForm } from './space_aware_privilege_form';
import { RoleValidator } from '../../../lib/validate_role';

const buildProps = (customProps) => {
  return {
    role: {
      elasticsearch: {},
      kibana: {}
    },
    spacesEnabled: true,
    spaces: [{
      id: 'default',
      name: 'Default Space',
      _reserved: true
    }, {
      id: 'marketing',
      name: 'Marketing'
    }],
    editable: true,
    kibanaAppPrivileges: [{
      name: 'all'
    }, {
      name: 'read'
    }],
    onChange: jest.fn(),
    validator: new RoleValidator(),
    ...customProps
  };
};

describe('<KibanaPrivileges>', () => {
  it('renders without crashing', () => {
    expect(shallow(<KibanaPrivileges {...buildProps()} />)).toMatchSnapshot();
  });

  it('renders the simple privilege form when spaces is disabled', () => {
    const props = buildProps({ spacesEnabled: false });
    const wrapper = shallow(<KibanaPrivileges {...props} />);
    expect(wrapper.find(SimplePrivilegeForm)).toHaveLength(1);
    expect(wrapper.find(SpaceAwarePrivilegeForm)).toHaveLength(0);
  });

  it('renders the space-aware privilege form when spaces is enabled', () => {
    const props = buildProps({ spacesEnabled: true });
    const wrapper = shallow(<KibanaPrivileges {...props} />);
    expect(wrapper.find(SimplePrivilegeForm)).toHaveLength(0);
    expect(wrapper.find(SpaceAwarePrivilegeForm)).toHaveLength(1);
  });
});
