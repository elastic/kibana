/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { EuiSuperSelect } from '@elastic/eui';
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { SimplePrivilegeSection } from './simple_privilege_section';

const buildProps = (customProps?: any) => {
  return {
    role: {
      name: '',
      elasticsearch: {
        cluster: ['manage'],
        indices: [],
        run_as: [],
      },
      kibana: [],
    },
    editable: true,
    kibanaAppPrivileges: ['all', 'read'],
    onChange: jest.fn(),
    ...customProps,
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
});
