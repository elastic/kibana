/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getKibanaPrivileges } from '../../../lib/get_application_privileges';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import { isReservedRole } from '../../../../../../lib/role';
import { copyRole } from '../../../lib/copy_role';
import { setApplicationPrivileges } from '../../../lib/set_application_privileges';

export class StandardPrivilegeForm extends Component {
  static propTypes = {
    kibanaAppPrivileges: PropTypes.object.isRequired,
    role: PropTypes.object.isRequired,
    rbacApplication: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
  }

  render() {
    const {
      kibanaAppPrivileges,
      role,
      rbacApplication,
    } = this.props;

    const kibanaPrivileges = getKibanaPrivileges(kibanaAppPrivileges, role, rbacApplication);

    const options = [
      { value: NO_PRIVILEGE_VALUE, text: 'none' },
      ...Object.keys(kibanaPrivileges).map(p => ({
        value: p,
        text: p
      }))
    ];

    const value = Object.keys(kibanaPrivileges).find(p => kibanaPrivileges[p].assigned) || NO_PRIVILEGE_VALUE;

    return (
      <EuiDescribedFormGroup
        title={<p>Application privileges</p>}
        description={<p>Manage the actions this role can perform within Kibana.</p>}
      >
        <EuiFormRow hasEmptyLabelSpace>
          <EuiSelect
            options={options}
            value={value}
            onChange={this.onKibanaStandardPrivilegesChange}
            disabled={isReservedRole(role)}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  onKibanaStandardPrivilegesChange = (e) => {
    const role = copyRole(this.props.role);
    const privilege = e.target.value;

    if (privilege === NO_PRIVILEGE_VALUE) {
      // unsetting all privileges -- only necessary until RBAC Phase 3
      const noPrivileges = {};
      setApplicationPrivileges(noPrivileges, role, this.props.rbacApplication);
    } else {
      const newPrivileges = {
        [privilege]: true
      };
      setApplicationPrivileges(newPrivileges, role, this.props.rbacApplication);
    }

    this.props.onChange(role);
  }

}
