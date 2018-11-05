/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlyout, EuiLink } from '@elastic/eui';
import { mount, shallow } from 'enzyme';
import React from 'react';
import { UserProfile } from '../../../../../../../../xpack_main/common/user_profile';
import { ImpactedSpacesFlyout } from './impacted_spaces_flyout';
import { PrivilegeSpaceTable } from './privilege_space_table';

const buildProps = (customProps = {}) => {
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
    kibanaAppPrivileges: [
      {
        name: 'all',
      },
      {
        name: 'read',
      },
    ],
    ...customProps,
  };
};

describe('<ImpactedSpacesFlyout>', () => {
  it('renders without crashing', () => {
    expect(shallow(<ImpactedSpacesFlyout {...buildProps()} />)).toMatchSnapshot();
  });

  it('does not immediately show the flyout', () => {
    const wrapper = mount(<ImpactedSpacesFlyout {...buildProps()} />);
    expect(wrapper.find(EuiFlyout)).toHaveLength(0);
  });

  it('shows the flyout after clicking the link', () => {
    const wrapper = mount(<ImpactedSpacesFlyout {...buildProps()} />);
    wrapper.find(EuiLink).simulate('click');
    expect(wrapper.find(EuiFlyout)).toHaveLength(1);
  });

  describe('with base privilege set to "all"', () => {
    it('calculates the effective privileges correctly', () => {
      const props = buildProps({
        role: {
          elasticsearch: {
            cluster: ['manage'],
          },
          kibana: {
            global: ['all'],
            space: {
              marketing: ['read'],
            },
          },
        },
      });

      const wrapper = shallow(<ImpactedSpacesFlyout {...props} />);
      wrapper.find(EuiLink).simulate('click');

      const table = wrapper.find(PrivilegeSpaceTable);
      expect(table.props()).toMatchObject({
        spacePrivileges: {
          default: ['all'],
          // base privilege of "all" supercedes specified privilege of "read" above
          marketing: ['all'],
        },
      });
    });
  });

  describe('with base privilege set to "read"', () => {
    it('calculates the effective privileges correctly', () => {
      const props = buildProps({
        role: {
          elasticsearch: {
            cluster: ['manage'],
          },
          kibana: {
            global: ['read'],
            space: {
              marketing: ['all'],
            },
          },
        },
      });

      const wrapper = shallow(<ImpactedSpacesFlyout {...props} />);
      wrapper.find(EuiLink).simulate('click');

      const table = wrapper.find(PrivilegeSpaceTable);
      expect(table.props()).toMatchObject({
        spacePrivileges: {
          default: ['read'],
          marketing: ['all'],
        },
      });
    });
  });

  describe('with base privilege set to "none"', () => {
    it('calculates the effective privileges correctly', () => {
      const props = buildProps({
        role: {
          elasticsearch: {
            cluster: ['manage'],
          },
          kibana: {
            global: [],
            space: {
              marketing: ['all'],
            },
          },
        },
      });

      const wrapper = shallow(<ImpactedSpacesFlyout {...props} />);
      wrapper.find(EuiLink).simulate('click');

      const table = wrapper.find(PrivilegeSpaceTable);
      expect(table.props()).toMatchObject({
        spacePrivileges: {
          default: ['none'],
          marketing: ['all'],
        },
      });
    });
  });
});
