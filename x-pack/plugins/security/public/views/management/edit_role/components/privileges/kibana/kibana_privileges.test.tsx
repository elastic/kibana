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
import { SimplePrivilegeSection } from './simple_privilege_section';
import { SpaceAwarePrivilegeSection } from './space_aware_privilege_section';

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
        spaces: [],
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
      management: {},
      catalogue: {},
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
    expect(wrapper.find(SimplePrivilegeSection)).toHaveLength(1);
    expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(0);
  });

  it('renders the space-aware privilege form when spaces is enabled', () => {
    const props = buildProps({ spacesEnabled: true });
    const wrapper = shallow(<KibanaPrivileges {...props} />);
    expect(wrapper.find(SimplePrivilegeSection)).toHaveLength(0);
    expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(1);
  });
});
