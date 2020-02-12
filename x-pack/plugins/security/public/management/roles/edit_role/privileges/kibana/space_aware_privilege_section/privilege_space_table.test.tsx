/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Role } from '../../../../../../../common/model';
import { createKibanaPrivileges } from '../__fixtures__/kibana_privileges';
import { kibanaFeatures } from '../__fixtures__/kibana_features';
import { PrivilegeFormCalculator } from '../privilege_form_calculator';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { PrivilegeSpaceTable } from './privilege_space_table';
import { Space } from '../../../../../../../../spaces/public';
import { EuiTableRow } from '@elastic/eui';
import { ReactWrapper } from 'enzyme';
import { findTestSubject } from 'test_utils/find_test_subject';

const createRole = (kibana: Role['kibana'] = []): Role => {
  return {
    name: 'my_role',
    elasticsearch: { cluster: [], run_as: [], indices: [] },
    kibana,
  };
};

const displaySpaces: Space[] = [
  {
    id: 'foo',
    name: 'Foo Space',
    disabledFeatures: [],
  },
  {
    id: 'default',
    name: 'Default Space',
    disabledFeatures: [],
  },
  {
    id: '*',
    name: 'Global',
    disabledFeatures: [],
  },
];

function getDisplayedPrivileges(wrapper: ReactWrapper<any>) {
  const rows = wrapper.find(EuiTableRow);

  return rows.reduce((acc, row) => {
    const spaces = findTestSubject(row, 'spacesColumn');
    const privilege = findTestSubject(row, 'privilegeColumn');
    const hasSupersededWarning =
      findTestSubject(row, 'spaceTablePrivilegeSupersededWarning').length > 0;

    return {
      ...acc,
      [spaces.text()]: {
        privilege: privilege.text(),
        hasSupersededWarning,
      },
    };
  }, {} as Record<string, { privilege: string; hasSupersededWarning: boolean }>);
}

describe('PrivilegeSpaceTable', () => {
  it('displays assigned base privileges', () => {
    const role = createRole([
      {
        base: ['all'],
        feature: {},
        spaces: ['foo'],
      },
      {
        base: ['read'],
        feature: {},
        spaces: ['*'],
      },
    ]);

    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const wrapper = mountWithIntl(
      <PrivilegeSpaceTable
        role={role}
        privilegeCalculator={calculator}
        displaySpaces={displaySpaces}
        onEdit={jest.fn()}
        onChange={jest.fn()}
      />
    );

    expect(getDisplayedPrivileges(wrapper)).toMatchInlineSnapshot(`
      Object {
        "Foo Space": Object {
          "hasSupersededWarning": false,
          "privilege": "All",
        },
        "Global": Object {
          "hasSupersededWarning": false,
          "privilege": "Read",
        },
      }
    `);
  });

  it('displays the most permissive assigned base privilege when multiple are assigned', () => {
    const role = createRole([
      {
        base: ['read', 'all'],
        feature: {},
        spaces: ['foo'],
      },
      {
        base: ['all', 'read'],
        feature: {},
        spaces: ['*'],
      },
    ]);

    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const wrapper = mountWithIntl(
      <PrivilegeSpaceTable
        role={role}
        privilegeCalculator={calculator}
        displaySpaces={displaySpaces}
        onEdit={jest.fn()}
        onChange={jest.fn()}
      />
    );

    expect(getDisplayedPrivileges(wrapper)).toMatchInlineSnapshot(`
      Object {
        "Foo Space": Object {
          "hasSupersededWarning": false,
          "privilege": "All",
        },
        "Global": Object {
          "hasSupersededWarning": false,
          "privilege": "All",
        },
      }
    `);
  });

  it('displays "Custom" when feature privileges are assigned', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
        spaces: ['foo'],
      },
      {
        base: [],
        feature: {
          with_sub_features: ['minimal_read'],
        },
        spaces: ['*'],
      },
    ]);

    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const wrapper = mountWithIntl(
      <PrivilegeSpaceTable
        role={role}
        privilegeCalculator={calculator}
        displaySpaces={displaySpaces}
        onEdit={jest.fn()}
        onChange={jest.fn()}
      />
    );

    expect(getDisplayedPrivileges(wrapper)).toMatchInlineSnapshot(`
      Object {
        "Foo Space": Object {
          "hasSupersededWarning": false,
          "privilege": "Custom",
        },
        "Global": Object {
          "hasSupersededWarning": false,
          "privilege": "Custom",
        },
      }
    `);
  });

  it('displays a warning when spaces privileges are less permissive than the configured global privileges', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
        spaces: ['foo'],
      },
      {
        base: ['all'],
        feature: {},
        spaces: ['*'],
      },
    ]);

    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const wrapper = mountWithIntl(
      <PrivilegeSpaceTable
        role={role}
        privilegeCalculator={calculator}
        displaySpaces={displaySpaces}
        onEdit={jest.fn()}
        onChange={jest.fn()}
      />
    );

    expect(getDisplayedPrivileges(wrapper)).toMatchInlineSnapshot(`
      Object {
        "Foo Space": Object {
          "hasSupersededWarning": true,
          "privilege": "Custom",
        },
        "Global": Object {
          "hasSupersededWarning": false,
          "privilege": "All",
        },
      }
    `);
  });

  it('fires the onChange callback when a privilege entry is deleted', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
        spaces: ['foo'],
      },
      {
        base: ['all'],
        feature: {},
        spaces: ['*'],
      },
    ]);

    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const onChange = jest.fn();

    const wrapper = mountWithIntl(
      <PrivilegeSpaceTable
        role={role}
        privilegeCalculator={calculator}
        displaySpaces={displaySpaces}
        onEdit={jest.fn()}
        onChange={onChange}
      />
    );

    // The first button will be the global entry, since the table sorts on this first.
    wrapper
      .find('EuiButtonIcon[iconType="trash"]')
      .first()
      .simulate('click');

    expect(onChange).toHaveBeenCalledWith(
      createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['all'],
          },
          spaces: ['foo'],
        },
      ])
    );
  });
  it('fires the onEdit callback when the edit button is clicked', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
        spaces: ['foo'],
      },
      {
        base: ['all'],
        feature: {},
        spaces: ['*'],
      },
    ]);

    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const onEdit = jest.fn();

    const wrapper = mountWithIntl(
      <PrivilegeSpaceTable
        role={role}
        privilegeCalculator={calculator}
        displaySpaces={displaySpaces}
        onEdit={onEdit}
        onChange={jest.fn()}
      />
    );

    wrapper
      .find('EuiButtonIcon[iconType="pencil"]')
      .first()
      .simulate('click');

    expect(onEdit).toHaveBeenCalledWith(0);
  });
});
