/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { KibanaPrivilege } from '../../../../../../../common/model/kibana_privilege';
import { RoleValidator } from '../../../lib/validate_role';
import { PrivilegeSpaceForm } from './privilege_space_form';

const buildProps = (customProps = {}) => {
  const availablePrivileges: KibanaPrivilege[] = ['all', 'read'];
  const selectedPrivilege: KibanaPrivilege = 'none';

  return {
    availableSpaces: [
      {
        id: 'default',
        name: 'Default Space',
        description: '',
        _reserved: true,
      },
      {
        id: 'marketing',
        name: 'Marketing',
        description: '',
      },
    ],
    selectedSpaceIds: [],
    availablePrivileges,
    selectedPrivilege,
    onChange: jest.fn(),
    onDelete: jest.fn(),
    validator: new RoleValidator(),
    intl: {} as any,
    ...customProps,
  };
};

describe('<PrivilegeSpaceForm>', () => {
  it('renders without crashing', () => {
    expect(
      shallowWithIntl(<PrivilegeSpaceForm.WrappedComponent {...buildProps()} />)
    ).toMatchSnapshot();
  });
});
