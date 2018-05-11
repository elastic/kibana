/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getClusterPrivileges } from '../../../../services/role_privileges';
import { isReservedRole } from '../lib/is_reserved_role';
import {
  EuiCheckboxGroup
} from '@elastic/eui';

export class ClusterPrivileges extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired
  };

  render() {
    const checkboxes = getClusterPrivileges().map(p => ({
      id: p,
      label: p
    }));

    const { role } = this.props;

    const selectionMap = (role.cluster || [])
      .map(k => ({ [k]: true }))
      .reduce((acc, o) => ({ ...acc, ...o }), {});

    return (
      <EuiCheckboxGroup
        options={checkboxes}
        idToSelectedMap={selectionMap}
        onChange={this.onClusterPrivilegesChange}
        disabled={isReservedRole(role)}
      />
    );
  }

  onClusterPrivilegesChange = (privilege) => {
    const { cluster } = this.props.role;
    const indexOfExistingPrivilege = cluster.indexOf(privilege);

    const shouldRemove = indexOfExistingPrivilege >= 0;

    const newClusterPrivs = [...cluster];
    if (shouldRemove) {
      newClusterPrivs.splice(indexOfExistingPrivilege, 1);
    } else {
      newClusterPrivs.push(privilege);
    }

    this.props.onChange(newClusterPrivs);
  }
}
