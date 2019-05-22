/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { KibanaPrivileges } from '../../../../../../../../common/model';
import { KibanaPrivilegeCalculatorFactory } from '../../../../../../../lib/kibana_privilege_calculator';
import { RoleValidator } from '../../../../lib/validate_role';
import { PrivilegeSpaceForm } from './privilege_space_form';

const buildProps = (customProps = {}) => {
  return {
    mode: 'create' as any,
    spaces: [
      {
        id: 'default',
        name: 'Default Space',
        description: '',
        disabledFeatures: [],
        _reserved: true,
      },
      {
        id: 'marketing',
        name: 'Marketing',
        description: '',
        disabledFeatures: [],
      },
    ],
    kibanaPrivileges: new KibanaPrivileges({
      features: {},
      global: {},
      space: {},
      reserved: {},
    }),
    privilegeCalculatorFactory: new KibanaPrivilegeCalculatorFactory(
      new KibanaPrivileges({
        global: {},
        features: {},
        space: {},
        reserved: {},
      })
    ),
    features: [],
    role: {
      name: 'test role',
      elasticsearch: {
        cluster: ['all'],
        indices: [] as any[],
        run_as: [] as string[],
      },
      kibana: [
        {
          spaces: [],
          base: [],
          feature: {},
        },
      ],
    },
    onChange: jest.fn(),
    onCancel: jest.fn(),
    onDelete: jest.fn(),
    validator: new RoleValidator(),
    intl: {} as any,
    editingIndex: 0,
    ...customProps,
  };
};

describe('<PrivilegeSpaceForm>', () => {
  it('renders without crashing', () => {
    expect(shallowWithIntl(<PrivilegeSpaceForm {...buildProps()} />)).toMatchSnapshot();
  });
});
