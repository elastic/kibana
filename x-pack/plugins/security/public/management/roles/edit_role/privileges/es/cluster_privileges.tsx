/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import _ from 'lodash';
import React, { Component } from 'react';

import type { Role } from '../../../../../../common/model';
import { isRoleReadOnly } from '../../../../../../common/model';

interface Props {
  role: Role;
  builtinClusterPrivileges: string[];
  onChange: (privs: string[]) => void;
  editable?: boolean;
}

export class ClusterPrivileges extends Component<Props, {}> {
  static defaultProps: Partial<Props> = {
    editable: true,
  };

  public render() {
    const availableClusterPrivileges = this.getAvailableClusterPrivileges();
    return <EuiFlexGroup>{this.buildComboBox(availableClusterPrivileges)}</EuiFlexGroup>;
  }

  public buildComboBox = (items: string[]) => {
    const { role, editable } = this.props;

    const options = items.map((i) => ({
      label: i,
    }));

    const selectedOptions = (role.elasticsearch.cluster || []).map((k) => ({ label: k }));

    return (
      <EuiFlexItem key={'clusterPrivs'}>
        <EuiComboBox
          data-test-subj={'cluster-privileges-combobox'}
          options={options}
          selectedOptions={selectedOptions}
          onChange={this.onClusterPrivilegesChange}
          onCreateOption={this.onCreateCustomPrivilege}
          isDisabled={isRoleReadOnly(role) || !editable}
        />
      </EuiFlexItem>
    );
  };

  public onClusterPrivilegesChange = (selectedPrivileges: any) => {
    this.props.onChange(selectedPrivileges.map((priv: any) => priv.label));
  };

  private onCreateCustomPrivilege = (customPrivilege: string) => {
    this.props.onChange([...this.props.role.elasticsearch.cluster, customPrivilege]);
  };

  private getAvailableClusterPrivileges = () => {
    const availableClusterPrivileges = [
      ...this.props.builtinClusterPrivileges,
      ...this.props.role.elasticsearch.cluster,
    ];

    return _.uniq(availableClusterPrivileges);
  };
}
