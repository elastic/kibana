/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { PrivilegeDefinition } from 'x-pack/plugins/security/common/model/privileges/privilege_definition';
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
        global: {
          minimum: [] as string[],
          feature: {},
        },
        space: {
          someSpace: {
            minimum: [] as string[],
            feature: {},
          },
        },
      },
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
    privilegeDefinition: new PrivilegeDefinition({
      global: {},
      space: {},
      features: {},
    }),
    intl: null as any,
    uiCapabilities: {
      navLinks: {},
      spaces: {
        manage: true,
      },
    },
    editable: true,
    kibanaAppPrivileges: ['all'],
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
