/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

<<<<<<< HEAD
import { shallow } from 'enzyme';
import React from 'react';
=======
import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
    ...customProps,
  };
};

describe('<PrivilegeSpaceForm>', () => {
  it('renders without crashing', () => {
<<<<<<< HEAD
    expect(shallow(<PrivilegeSpaceForm {...buildProps()} />)).toMatchSnapshot();
=======
    expect(shallowWithIntl(<PrivilegeSpaceForm {...buildProps()} />)).toMatchSnapshot();
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  });
});
