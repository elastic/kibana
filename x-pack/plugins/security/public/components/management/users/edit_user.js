/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

import React, { Component } from 'react';
import chrome from 'ui/chrome';
import {
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiForm,
  EuiFormRow,
  EuiText,
  EuiFieldText,
  EuiPage,
  EuiComboBox
} from '@elastic/eui';
export class EditUser extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      roles: null,
      selectedRoles: []
    };
  }
  async componentWillMount() {
    const { httpClient, username } = this.props;
    const userPath = chrome.addBasePath(`/api/security/v1/users/${username}`);
    const rolesPath = chrome.addBasePath('/api/security/v1/roles');
    const { data: user } = await httpClient.get(userPath);
    const { data: roles } = await httpClient.get(rolesPath);

    this.setState({ user, roles, selectedRoles: user.roles || [] });
  }
  onChange = selectedRoles => {
    this.setState({
      selectedRoles
    });
  };

  render() {
    const { user, roles, selectedRoles } = this.state;
    if (!user || !roles) {
      return null;
    }
    return (
      <EuiPage>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2>&quot;{user.username}&quot; User</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton color="danger" iconType="trash">
              Delete user
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiForm>
          <EuiFormRow label="Username">
            <EuiText>
              <p>{user.username}</p>
            </EuiText>
          </EuiFormRow>
          <EuiFormRow label="Full name">
            <EuiFieldText name="full_name" defaultValue={user.full_name} />
          </EuiFormRow>
          <EuiFormRow label="Email">
            <EuiFieldText name="email" defaultValue={user.email} />
          </EuiFormRow>
          <EuiFormRow label="Roles">
            <EuiComboBox
              placeholder="Add a role"
              onChange={this.onChange}
              name="roles"
              options={roles.map(role => {
                return { label: role.name };
              })}
              selectedOptions={selectedRoles}
            />
          </EuiFormRow>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton onClick={() => {}}>Cancel</EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false} />
            <EuiButton fill onClick={() => {}}>
              Save
            </EuiButton>
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiFormRow label="Change password">
            <EuiLink>Change password</EuiLink>
          </EuiFormRow>
        </EuiForm>
      </EuiPage>
    );
  }
}
