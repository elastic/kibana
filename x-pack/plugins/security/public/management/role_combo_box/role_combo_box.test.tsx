/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';

import { RoleComboBox } from '.';
import { EuiComboBox } from '@elastic/eui';
import { findTestSubject } from '@kbn/test/jest';

describe('RoleComboBox', () => {
  it('renders the provided list of roles via EuiComboBox options', () => {
    const availableRoles = [
      {
        name: 'role-1',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [],
        metadata: {},
      },
      {
        name: 'role-2',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [],
        metadata: {},
      },
    ];
    const wrapper = mountWithIntl(
      <RoleComboBox availableRoles={availableRoles} selectedRoleNames={[]} onChange={jest.fn()} />
    );

    expect(wrapper.find(EuiComboBox).props().options).toMatchInlineSnapshot(`
      Array [
        Object {
          "color": "default",
          "data-test-subj": "roleOption-role-1",
          "label": "role-1",
          "value": Object {
            "isDeprecated": false,
          },
        },
        Object {
          "color": "default",
          "data-test-subj": "roleOption-role-2",
          "label": "role-2",
          "value": Object {
            "isDeprecated": false,
          },
        },
      ]
    `);
  });

  it('renders deprecated roles as such', () => {
    const availableRoles = [
      {
        name: 'role-1',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [],
        metadata: { _deprecated: true },
      },
    ];
    const wrapper = mountWithIntl(
      <RoleComboBox availableRoles={availableRoles} selectedRoleNames={[]} onChange={jest.fn()} />
    );

    expect(wrapper.find(EuiComboBox).props().options).toMatchInlineSnapshot(`
      Array [
        Object {
          "color": "warning",
          "data-test-subj": "roleOption-role-1",
          "label": "role-1",
          "value": Object {
            "isDeprecated": true,
          },
        },
      ]
    `);
  });

  it('renders the selected role names in the expanded list, coded according to deprecated status', () => {
    const availableRoles = [
      {
        name: 'role-1',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [],
        metadata: {},
      },
      {
        name: 'role-2',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [],
        metadata: {},
      },
    ];
    const wrapper = mountWithIntl(
      <div>
        <RoleComboBox availableRoles={availableRoles} selectedRoleNames={[]} onChange={jest.fn()} />
      </div>
    );

    findTestSubject(wrapper, 'comboBoxToggleListButton').simulate('click');

    wrapper.find(EuiComboBox).setState({ isListOpen: true });

    expect(findTestSubject(wrapper, 'rolesDropdown-renderOption')).toMatchInlineSnapshot(`
      Array [
        <div
          className="euiText euiText--medium"
          data-test-subj="rolesDropdown-renderOption"
        >
          <EuiTextColor
            color="default"
            component="div"
          >
            <div
              className="euiTextColor euiTextColor--default"
            >
              role-1
               
            </div>
          </EuiTextColor>
        </div>,
        <div
          className="euiText euiText--medium"
          data-test-subj="rolesDropdown-renderOption"
        >
          <EuiTextColor
            color="default"
            component="div"
          >
            <div
              className="euiTextColor euiTextColor--default"
            >
              role-2
               
            </div>
          </EuiTextColor>
        </div>,
      ]
    `);
  });
});
