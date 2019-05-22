/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { KibanaPrivileges, Role } from '../../../../../../../common/model';
import { RoleValidator } from '../../../lib/validate_role';
import { KibanaPrivilegesRegion } from './kibana_privileges_region';
import { SimplePrivilegeSection } from './simple_privilege_section';
import { SpaceAwarePrivilegeSection } from './space_aware_privilege_section';
import { TransformErrorSection } from './transform_error_section';

const buildProps = (customProps = {}) => {
  return {
    role: {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    },
    spacesEnabled: true,
    spaces: [
      {
        id: 'default',
        name: 'Default Space',
        disabledFeatures: [],
        _reserved: true,
      },
      {
        id: 'marketing',
        name: 'Marketing',
        disabledFeatures: [],
      },
    ],
    features: [],
    kibanaPrivileges: new KibanaPrivileges({
      global: {},
      space: {},
      features: {},
      reserved: {},
    }),
    intl: null as any,
    uiCapabilities: {
      navLinks: {},
      management: {},
      catalogue: {},
      spaces: {
        manage: true,
      },
    },
    editable: true,
    onChange: jest.fn(),
    validator: new RoleValidator(),
    ...customProps,
  };
};

describe('<KibanaPrivileges>', () => {
  it('renders without crashing', () => {
    expect(shallow(<KibanaPrivilegesRegion {...buildProps()} />)).toMatchSnapshot();
  });

  it('renders the simple privilege form when spaces is disabled', () => {
    const props = buildProps({ spacesEnabled: false });
    const wrapper = shallow(<KibanaPrivilegesRegion {...props} />);
    expect(wrapper.find(SimplePrivilegeSection)).toHaveLength(1);
    expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(0);
  });

  it('renders the space-aware privilege form when spaces is enabled', () => {
    const props = buildProps({ spacesEnabled: true });
    const wrapper = shallow(<KibanaPrivilegesRegion {...props} />);
    expect(wrapper.find(SimplePrivilegeSection)).toHaveLength(0);
    expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(1);
  });

  it('renders the transform error section when the role has a transform error', () => {
    const props = buildProps({ spacesEnabled: true });
    (props.role as Role)._transform_error = ['kibana'];

    const wrapper = shallow(<KibanaPrivilegesRegion {...props} />);
    expect(wrapper.find(SimplePrivilegeSection)).toHaveLength(0);
    expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(0);
    expect(wrapper.find(TransformErrorSection)).toHaveLength(1);
  });
});
