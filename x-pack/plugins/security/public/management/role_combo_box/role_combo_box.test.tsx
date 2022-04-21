/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { RoleComboBox } from './role_combo_box';

describe('RoleComboBox', () => {
  it('renders roles grouped by custom, user, admin, system and deprecated roles with correct color', () => {
    const wrapper = shallowWithIntl(
      <RoleComboBox
        availableRoles={[
          {
            name: 'custom_role',
            elasticsearch: { cluster: [], indices: [], run_as: [] },
            kibana: [],
            metadata: {},
          },
          {
            name: 'reserved_role',
            elasticsearch: { cluster: [], indices: [], run_as: [] },
            kibana: [],
            metadata: { _reserved: true, _deprecated: false },
          },
          {
            name: 'some_admin',
            elasticsearch: { cluster: [], indices: [], run_as: [] },
            kibana: [],
            metadata: { _reserved: true, _deprecated: false },
          },
          {
            name: 'some_system',
            elasticsearch: { cluster: [], indices: [], run_as: [] },
            kibana: [],
            metadata: { _reserved: true, _deprecated: false },
          },
          {
            name: 'deprecated_role',
            elasticsearch: { cluster: [], indices: [], run_as: [] },
            kibana: [],
            metadata: { _reserved: true, _deprecated: true },
          },
        ]}
        selectedRoleNames={[]}
        onChange={jest.fn()}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiComboBox
        async={false}
        compressed={false}
        data-test-subj="rolesDropdown"
        fullWidth={false}
        isClearable={true}
        onChange={[Function]}
        options={
          Array [
            Object {
              "label": "Custom roles",
              "options": Array [
                Object {
                  "color": undefined,
                  "data-test-subj": "roleOption-custom_role",
                  "label": "custom_role",
                  "value": Object {
                    "deprecatedReason": undefined,
                    "isAdmin": false,
                    "isDeprecated": false,
                    "isReserved": false,
                    "isSystem": false,
                  },
                },
              ],
            },
            Object {
              "label": "User roles",
              "options": Array [
                Object {
                  "color": "primary",
                  "data-test-subj": "roleOption-reserved_role",
                  "label": "reserved_role",
                  "value": Object {
                    "deprecatedReason": undefined,
                    "isAdmin": false,
                    "isDeprecated": false,
                    "isReserved": true,
                    "isSystem": false,
                  },
                },
              ],
            },
            Object {
              "label": "Admin roles",
              "options": Array [
                Object {
                  "color": "primary",
                  "data-test-subj": "roleOption-some_admin",
                  "label": "some_admin",
                  "value": Object {
                    "deprecatedReason": undefined,
                    "isAdmin": true,
                    "isDeprecated": false,
                    "isReserved": true,
                    "isSystem": false,
                  },
                },
              ],
            },
            Object {
              "label": "System roles",
              "options": Array [
                Object {
                  "color": "primary",
                  "data-test-subj": "roleOption-some_system",
                  "label": "some_system",
                  "value": Object {
                    "deprecatedReason": undefined,
                    "isAdmin": false,
                    "isDeprecated": false,
                    "isReserved": true,
                    "isSystem": true,
                  },
                },
              ],
            },
            Object {
              "label": "Deprecated roles",
              "options": Array [
                Object {
                  "color": "warning",
                  "data-test-subj": "roleOption-deprecated_role",
                  "label": "deprecated_role",
                  "value": Object {
                    "deprecatedReason": undefined,
                    "isAdmin": false,
                    "isDeprecated": true,
                    "isReserved": true,
                    "isSystem": false,
                  },
                },
              ],
            },
          ]
        }
        placeholder="Select roles"
        renderOption={[Function]}
        selectedOptions={Array []}
        singleSelection={false}
        sortMatchesBy="none"
      />
    `);
  });
});
