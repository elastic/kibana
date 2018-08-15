/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getClusterPrivileges } from '../../../../../../services/role_privileges';
import { isReservedRole } from '../../../../../../lib/role';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

export class ClusterPrivileges extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  render() {

    const clusterPrivileges = getClusterPrivileges();

    return (
      <EuiFlexGroup>
        {this.buildComboBox(clusterPrivileges)}
      </EuiFlexGroup>
    );
  }

  buildComboBox = (items, key) => {
    const role = this.props.role;

    const options = items.map(i => ({
      label: i
    }));

    const selectedOptions = (role.elasticsearch.cluster || [])
      .map(k => ({ label: k }));

    return (
      <EuiFlexItem key={key}>
        <EuiComboBox
          options={options}
          selectedOptions={selectedOptions}
          onChange={this.onClusterPrivilegesChange}
          isDisabled={isReservedRole(role)}
        />
      </EuiFlexItem>
    );
  };

  onClusterPrivilegesChange = (selectedPrivileges) => {
    this.props.onChange(selectedPrivileges.map(priv => priv.label));
  }
}
