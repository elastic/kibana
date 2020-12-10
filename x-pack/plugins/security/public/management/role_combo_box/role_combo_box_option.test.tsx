/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { RoleComboBoxOption } from './role_combo_box_option';

describe('RoleComboBoxOption', () => {
  it('renders a regular role correctly', () => {
    const wrapper = shallowWithIntl(
      <RoleComboBoxOption
        option={{
          color: 'default',
          label: 'role-1',
        }}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiText
        color="default"
        data-test-subj="rolesDropdown-renderOption"
      >
        role-1
         
      </EuiText>
    `);
  });

  it('renders a deprecated role correctly', () => {
    const wrapper = shallowWithIntl(
      <RoleComboBoxOption
        option={{
          color: 'warning',
          label: 'role-1',
          value: {
            isDeprecated: true,
          },
        }}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiText
        color="warning"
        data-test-subj="rolesDropdown-renderOption"
      >
        role-1
         
        (deprecated)
      </EuiText>
    `);
  });
});
