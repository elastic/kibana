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
  EuiIcon,
  EuiCheckboxGroup,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiToolTip,
  EuiTitle,
  EuiForm,
  EuiFormRow,
  EuiText,
  EuiFieldText,
  EuiPage,
  EuiComboBox
} from '@elastic/eui';
import { privileges } from '../../../services/shield_privileges';
export class EditRole extends Component {
  constructor(props) {
    super(props);
    this.state = {
      role: null
    };
  }
  async componentWillMount() {
    const { httpClient, rolename } = this.props;
    const rolePath = chrome.addBasePath(`/api/security/v1/roles/${rolename}`);
    //const rolesPath = chrome.addBasePath('/api/security/v1/roles');
    const { data: role } = await httpClient.get(rolePath);
    //const { data: roles } = await httpClient.get(rolesPath);

    this.setState({ role });
  }
  onChange = selectedRoles => {
    this.setState({
      selectedRoles
    });
  };

  render() {
    const { role } = this.state;
    if (!role) {
      return null;
    }
    const reserved = role.metadata._reserved;
    let actionButton;
    let formControls = null;
    if (reserved) {
      actionButton = (
        <EuiToolTip
          position="top"
          content="Reserved roles are built-in and cannot be removed or modified."
        >
          <EuiText>
            <div>
              <EuiIcon type="lock" /> Reserved
            </div>
          </EuiText>
        </EuiToolTip>
      );
    } else {
      actionButton = (
        <EuiButton color="danger" iconType="trash">
          Delete role
        </EuiButton>
      );
      formControls = (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => {}}>Cancel</EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false} />
          <EuiButton fill onClick={() => {}}>
          Save
          </EuiButton>
        </EuiFlexGroup>
      );
    }
    return (
      <EuiPage>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2>&quot;{role.name}&quot; role</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{actionButton}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiForm>
          <EuiFormRow label="Name">
            <EuiText>
              <p>{role.name}</p>
            </EuiText>
          </EuiFormRow>
          <EuiFormRow label="Cluster privileges">
            <EuiCheckboxGroup
              options={privileges.cluster.map(privilege => {
                return { label: privilege, id: privilege };
              })}
              onChange={() => {}}
              disabled={reserved}
            />
          </EuiFormRow>
          <EuiSpacer />
          { formControls }
        </EuiForm>
      </EuiPage>
    );
  }
}
