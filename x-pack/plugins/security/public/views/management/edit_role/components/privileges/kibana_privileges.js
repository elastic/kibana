/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { isReservedRole } from '../../../../../lib/role';
import { getKibanaPrivileges } from '../../lib/get_application_privileges';
import { setApplicationPrivileges } from '../../lib/set_application_privileges';

import { CollapsiblePanel } from '../collapsible_panel';
import {
  EuiSelect,
  EuiDescribedFormGroup,
  EuiFormRow,
} from '@elastic/eui';

const noPrivilegeValue = '-none-';

export class KibanaPrivileges extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    spaces: PropTypes.array,
    kibanaAppPrivileges: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  idPrefix = () => `${this.props.rbacApplication}_`;

  privilegeToId = (privilege) => `${this.idPrefix()}${privilege}`;

  idToPrivilege = (id) => id.split(this.idPrefix())[1];

  render() {
    return (
      <CollapsiblePanel iconType={'logoKibana'} title={'Kibana'}>
        {this.getForm()}
      </CollapsiblePanel>
    );
  }

  getForm = () => {
    const {
      kibanaAppPrivileges,
      role,
      rbacApplication
    } = this.props;

    const kibanaPrivileges = getKibanaPrivileges(kibanaAppPrivileges, role, rbacApplication);

    const options = [
      { value: noPrivilegeValue, text: 'none' },
      ...Object.keys(kibanaPrivileges).map(p => ({
        value: p,
        text: p
      }))
    ];

    const value = Object.keys(kibanaPrivileges).find(p => kibanaPrivileges[p]) || noPrivilegeValue;

    return (
      <EuiDescribedFormGroup
        title={<p>Application privileges</p>}
        description={<p>Manage the actions this role can perform within Kibana.</p>}
      >
        <EuiFormRow hasEmptyLabelSpace>
          <EuiSelect
            options={options}
            value={value}
            onChange={this.onKibanaPrivilegesChange}
            disabled={isReservedRole(role)}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  onKibanaPrivilegesChange = (e) => {
    const role = {
      ...this.props.role,
      applications: [...this.props.role.applications]
    };

    const privilege = e.target.value;

    if (privilege === noPrivilegeValue) {
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
