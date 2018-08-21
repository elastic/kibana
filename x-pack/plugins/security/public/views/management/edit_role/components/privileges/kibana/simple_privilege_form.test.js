/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { SimplePrivilegeForm } from './simple_privilege_form';
import { PrivilegeSelector } from './privilege_selector';

const buildProps = (customProps) => {
  return {
    role: {
      elasticsearch: {
        cluster: ['manage']
      },
      kibana: {
        global: []
      }
    },
    editable: true,
    kibanaAppPrivileges: [{
      name: 'all'
    }, {
      name: 'read'
    }],
    onChange: jest.fn(),
    ...customProps
  };
};

describe('<SimplePrivilegeForm>', () => {
  it('renders without crashing', () => {
    expect(shallow(<SimplePrivilegeForm {...buildProps()} />)).toMatchSnapshot();
  });

  it('displays "none" when no privilege is selected', () => {
    const props = buildProps();
    const wrapper = shallow(<SimplePrivilegeForm {...props} />);
    const selector = wrapper.find(PrivilegeSelector);
    expect(selector.props()).toMatchObject({
      value: "none"
    });
  });

  it('displays the selected privilege', () => {
    const props = buildProps({
      role: {
        elasticsearch: {},
        kibana: {
          global: ["read"]
        }
      }
    });
    const wrapper = shallow(<SimplePrivilegeForm {...props} />);
    const selector = wrapper.find(PrivilegeSelector);
    expect(selector.props()).toMatchObject({
      value: "read"
    });
  });

  it('fires its onChange callback when the privilege changes', () => {
    const props = buildProps();
    const wrapper = mount(<SimplePrivilegeForm {...props} />);
    const selector = wrapper.find(PrivilegeSelector).find('select');
    selector.simulate('change', { target: { value: 'all' } });

    expect(props.onChange).toHaveBeenCalledWith({
      elasticsearch: {
        cluster: ["manage"]
      },
      kibana: {
        global: ["all"]
      }
    });
  });
});
