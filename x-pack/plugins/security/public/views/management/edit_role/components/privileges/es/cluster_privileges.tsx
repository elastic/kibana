/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { Component } from 'react';
import { Role } from '../../../../../../../common/model';
import { isReadOnlyRole } from '../../../../../../lib/role_utils';
// @ts-ignore
import { getClusterPrivileges } from '../../../../../../services/role_privileges';

interface Props {
  role: Role;
  onChange: (privs: string[]) => void;
}

export class ClusterPrivileges extends Component<Props, {}> {
  public render() {
    const clusterPrivileges = getClusterPrivileges();

    return <EuiFlexGroup>{this.buildComboBox(clusterPrivileges)}</EuiFlexGroup>;
  }

  public buildComboBox = (items: string[]) => {
    const role = this.props.role;

    const options = items.map(i => ({
      label: i,
    }));

    const selectedOptions = (role.elasticsearch.cluster || []).map(k => ({ label: k }));

    return (
      <EuiFlexItem key={'clusterPrivs'}>
        <EuiComboBox
          options={options}
          selectedOptions={selectedOptions}
          onChange={this.onClusterPrivilegesChange}
          isDisabled={isReadOnlyRole(role)}
        />
      </EuiFlexItem>
    );
  };

  public onClusterPrivilegesChange = (selectedPrivileges: any) => {
    this.props.onChange(selectedPrivileges.map((priv: any) => priv.label));
  };
}
