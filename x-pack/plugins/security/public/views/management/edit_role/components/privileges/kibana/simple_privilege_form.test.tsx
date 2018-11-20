/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

<<<<<<< HEAD
import { mount, shallow } from 'enzyme';
import React from 'react';
=======
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { PrivilegeSelector } from './privilege_selector';
import { SimplePrivilegeForm } from './simple_privilege_form';

const buildProps = (customProps?: any) => {
  return {
    role: {
      name: '',
      elasticsearch: {
        cluster: ['manage'],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: [],
        space: {},
      },
    },
    editable: true,
    kibanaAppPrivileges: ['all', 'read'],
    onChange: jest.fn(),
    ...customProps,
  };
};

describe('<SimplePrivilegeForm>', () => {
  it('renders without crashing', () => {
<<<<<<< HEAD
    expect(shallow(<SimplePrivilegeForm {...buildProps()} />)).toMatchSnapshot();
=======
    expect(shallowWithIntl(<SimplePrivilegeForm {...buildProps()} />)).toMatchSnapshot();
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  });

  it('displays "none" when no privilege is selected', () => {
    const props = buildProps();
<<<<<<< HEAD
    const wrapper = shallow(<SimplePrivilegeForm {...props} />);
=======
    const wrapper = shallowWithIntl(<SimplePrivilegeForm {...props} />);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    const selector = wrapper.find(PrivilegeSelector);
    expect(selector.props()).toMatchObject({
      value: 'none',
    });
  });

  it('displays the selected privilege', () => {
    const props = buildProps({
      role: {
        elasticsearch: {},
        kibana: {
          global: ['read'],
        },
      },
    });
<<<<<<< HEAD
    const wrapper = shallow(<SimplePrivilegeForm {...props} />);
=======
    const wrapper = shallowWithIntl(<SimplePrivilegeForm {...props} />);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    const selector = wrapper.find(PrivilegeSelector);
    expect(selector.props()).toMatchObject({
      value: 'read',
    });
  });

  it('fires its onChange callback when the privilege changes', () => {
    const props = buildProps();
<<<<<<< HEAD
    const wrapper = mount(<SimplePrivilegeForm {...props} />);
=======
    const wrapper = mountWithIntl(<SimplePrivilegeForm {...props} />);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    const selector = wrapper.find(PrivilegeSelector).find('select');
    selector.simulate('change', { target: { value: 'all' } });

    expect(props.onChange).toHaveBeenCalledWith({
      name: '',
      elasticsearch: {
        cluster: ['manage'],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: ['all'],
        space: {},
      },
    });
  });
});
