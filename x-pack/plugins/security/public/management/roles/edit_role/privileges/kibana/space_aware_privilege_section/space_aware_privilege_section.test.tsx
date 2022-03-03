/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';

import { kibanaFeatures } from '../../../../__fixtures__/kibana_features';
import { createKibanaPrivileges } from '../../../../__fixtures__/kibana_privileges';
import { RoleValidator } from '../../../validate_role';
import { PrivilegeSummary } from '../privilege_summary';
import { PrivilegeSpaceForm } from './privilege_space_form';
import { PrivilegeSpaceTable } from './privilege_space_table';
import { SpaceAwarePrivilegeSection } from './space_aware_privilege_section';

const buildProps = (customProps: any = {}) => {
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
    uiCapabilities: {
      navLinks: {},
      spaces: {
        manage: true,
      },
    },
    features: kibanaFeatures,
    editable: true,
    onChange: jest.fn(),
    validator: new RoleValidator(),
    kibanaPrivileges: createKibanaPrivileges(kibanaFeatures),
    canCustomizeSubFeaturePrivileges: true,
    ...customProps,
  };
};

describe('<SpaceAwarePrivilegeSection>', () => {
  it('shows the space table if existing space privileges are declared', () => {
    const props = buildProps({
      role: {
        elasticsearch: {
          cluster: ['manage'],
        },
        kibana: [
          {
            spaces: ['default'],
            base: ['all'],
            feature: {},
          },
        ],
      },
    });

    const wrapper = mountWithIntl(<SpaceAwarePrivilegeSection {...props} />);

    const table = wrapper.find(PrivilegeSpaceTable);
    expect(table).toHaveLength(1);
  });

  it('hides the space table if there are no existing space privileges', () => {
    const props = buildProps();

    const wrapper = mountWithIntl(<SpaceAwarePrivilegeSection {...props} />);

    const table = wrapper.find(PrivilegeSpaceTable);
    expect(table).toHaveLength(0);
  });

  it('Renders flyout after clicking "Add space privilege" button', () => {
    const props = buildProps({
      role: {
        elasticsearch: {
          cluster: ['manage'],
        },
        kibana: [
          {
            spaces: ['default'],
            base: ['all'],
            feature: {},
          },
        ],
      },
    });

    const wrapper = mountWithIntl(<SpaceAwarePrivilegeSection {...props} />);
    expect(wrapper.find(PrivilegeSpaceForm)).toHaveLength(0);

    wrapper.find('button[data-test-subj="addSpacePrivilegeButton"]').simulate('click');

    expect(wrapper.find(PrivilegeSpaceForm)).toHaveLength(1);
  });

  it('hides privilege summary when the role is reserved', () => {
    const props = buildProps({
      role: {
        name: '',
        metadata: {
          _reserved: true,
        },
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      },
    });

    const wrapper = mountWithIntl(<SpaceAwarePrivilegeSection {...props} />);
    expect(wrapper.find(PrivilegeSummary)).toHaveLength(0);
  });

  describe('with base privilege set to "read"', () => {
    it('allows space privileges to be customized', () => {
      const props = buildProps({
        role: {
          elasticsearch: {
            cluster: ['manage'],
          },
          kibana: [
            {
              spaces: ['default'],
              base: ['read'],
              feature: {},
            },
          ],
        },
      });

      const wrapper = mountWithIntl(<SpaceAwarePrivilegeSection {...props} />);

      const table = wrapper.find(PrivilegeSpaceTable);
      expect(table).toHaveLength(1);

      const addPrivilegeButton = wrapper.find('button[data-test-subj="addSpacePrivilegeButton"]');
      expect(addPrivilegeButton).toHaveLength(1);
    });
  });

  describe('with base privilege set to "none"', () => {
    it('allows space privileges to be customized', () => {
      const props = buildProps({
        role: {
          elasticsearch: {
            cluster: ['manage'],
          },
          kibana: [
            {
              spaces: ['default'],
              base: [],
              feature: {},
            },
          ],
        },
      });

      const wrapper = mountWithIntl(<SpaceAwarePrivilegeSection {...props} />);

      const table = wrapper.find(PrivilegeSpaceTable);
      expect(table).toHaveLength(1);

      const addPrivilegeButton = wrapper.find('button[data-test-subj="addSpacePrivilegeButton"]');
      expect(addPrivilegeButton).toHaveLength(1);
    });
  });

  describe('with user profile disabling "manageSpaces"', () => {
    it('renders a warning message instead of the privilege form', () => {
      const props = buildProps({
        uiCapabilities: {
          navLinks: {},
          spaces: { manage: false },
        },
      });

      const wrapper = shallowWithIntl(<SpaceAwarePrivilegeSection {...props} />);
      expect(wrapper).toMatchSnapshot();
    });
  });
});
