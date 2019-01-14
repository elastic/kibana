/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { EuiButtonGroup, EuiButtonGroupProps, EuiSuperSelect } from '@elastic/eui';
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { PrivilegeDefinition, Role } from '../../../../../../../../common/model';
import { EffectivePrivilegesFactory } from '../../../../../../../lib/effective_privileges';
import { SimplePrivilegeSection } from './simple_privilege_section';

const buildProps = (customProps: any = {}) => {
  const privilegeDefinition = new PrivilegeDefinition({
    features: {
      feature1: {
        all: ['*'],
        read: ['read'],
      },
    },
    global: {},
    space: {},
  });

  const role = {
    name: '',
    elasticsearch: {
      cluster: ['manage'],
      indices: [],
      run_as: [],
    },
    kibana: [],
    ...customProps.role,
  };

  return {
    editable: true,
    privilegeDefinition,
    effectivePrivileges: new EffectivePrivilegesFactory(privilegeDefinition).getInstance(role),
    features: [
      {
        id: 'feature1',
        name: 'Feature 1',
        privileges: {
          all: {
            app: ['app'],
            savedObject: {
              all: ['foo'],
              read: [],
            },
            ui: ['app-ui'],
          },
          read: {
            app: ['app'],
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['app-ui'],
          },
        },
      },
    ] as Feature[],
    onChange: jest.fn(),
    ...customProps,
    role,
  };
};

describe('<SimplePrivilegeForm>', () => {
  it('renders without crashing', () => {
    expect(shallowWithIntl(<SimplePrivilegeSection {...buildProps()} />)).toMatchSnapshot();
  });

  it('displays "none" when no privilege is selected', () => {
    const props = buildProps();
    const wrapper = shallowWithIntl(<SimplePrivilegeSection {...props} />);
    const selector = wrapper.find(EuiSuperSelect);
    expect(selector.props()).toMatchObject({
      valueOfSelected: 'none',
    });
  });

  it('displays "custom" when feature privileges are customized', () => {
    const props = buildProps({
      role: {
        elasticsearch: {},
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: {
              feature1: ['foo'],
            },
          },
        ],
      },
    });
    const wrapper = shallowWithIntl(<SimplePrivilegeSection {...props} />);
    const selector = wrapper.find(EuiSuperSelect);
    expect(selector.props()).toMatchObject({
      valueOfSelected: 'custom',
    });
  });

  it('displays the selected privilege', () => {
    const props = buildProps({
      role: {
        elasticsearch: {},
        kibana: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
        ],
      },
    });
    const wrapper = shallowWithIntl(<SimplePrivilegeSection {...props} />);
    const selector = wrapper.find(EuiSuperSelect);
    expect(selector.props()).toMatchObject({
      valueOfSelected: 'read',
    });
  });

  it('fires its onChange callback when the privilege changes', () => {
    const props = buildProps();
    const wrapper = mountWithIntl(<SimplePrivilegeSection {...props} />);
    const selector = wrapper.find(EuiSuperSelect);
    (selector.props() as any).onChange('all');

    expect(props.onChange).toHaveBeenCalledWith({
      name: '',
      elasticsearch: {
        cluster: ['manage'],
        indices: [],
        run_as: [],
      },
      kibana: [{ feature: {}, base: ['all'], spaces: ['*'] }],
    });
  });

  it('allows feature privileges to be customized', () => {
    const props = buildProps({
      onChange: (role: Role) => {
        wrapper.setProps({
          role,
          effectivePrivileges: new EffectivePrivilegesFactory(
            props.privilegeDefinition
          ).getInstance(role),
        });
      },
    });
    const wrapper = mountWithIntl(<SimplePrivilegeSection {...props} />);
    const selector = wrapper.find(EuiSuperSelect);
    (selector.props() as any).onChange('custom');

    wrapper.update();

    const featurePrivilegeToggles = wrapper.find(EuiButtonGroup);
    expect(featurePrivilegeToggles).toHaveLength(1);
    expect(featurePrivilegeToggles.find('button')).toHaveLength(3);

    (featurePrivilegeToggles.props() as EuiButtonGroupProps).onChange('feature1_all');

    wrapper.update();

    expect(wrapper.props().role).toEqual({
      elasticsearch: {
        cluster: ['manage'],
        indices: [],
        run_as: [],
      },
      kibana: [
        {
          base: [],
          feature: {
            feature1: ['all'],
          },
          spaces: ['*'],
        },
      ],
      name: '',
    });
  });
});
