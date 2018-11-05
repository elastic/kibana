/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { KibanaPrivilege } from '../../../../../../../../security/common/model/kibana_privilege';
import { UserProfile } from '../../../../../../../../xpack_main/common/user_profile';
import { RoleValidator } from '../../../lib/validate_role';
import { KibanaPrivileges } from './kibana_privileges';
import { SimplePrivilegeForm } from './simple_privilege_form';
import { SpaceAwarePrivilegeForm } from './space_aware_privilege_form';

const buildProps = (customProps = {}) => {
  return {
    role: {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: [],
        space: {},
      },
    },
    spacesEnabled: true,
    spaces: [
      {
        id: 'default',
        name: 'Default Space',
        _reserved: true,
      },
      {
        id: 'marketing',
        name: 'Marketing',
      },
    ],
    userProfile: new UserProfile(),
    editable: true,
    kibanaAppPrivileges: ['all' as KibanaPrivilege],
    onChange: jest.fn(),
    validator: new RoleValidator(),
    ...customProps,
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
