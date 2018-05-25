/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { isReservedRole } from '../../../../../lib/role';
import { getKibanaPrivileges } from '../../lib/get_application_privileges';
import { togglePrivilege } from '../../lib/set_application_privileges';

import { CollapsiblePanel } from '../collapsible_panel';
import {
  EuiCheckboxGroup,
  EuiDescribedFormGroup,
} from '@elastic/eui';
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

    const checkboxes = Object.keys(kibanaPrivileges).map(p => ({
      id: this.privilegeToId(p),
      label: p
    }));

    const selectionMap = Object.keys(kibanaPrivileges).reduce((acc, p) => {
      return {
        ...acc,
        [this.privilegeToId(p)]: kibanaPrivileges[p]
      };
    }, {});

    return (
      <EuiDescribedFormGroup
        title={<p>Application privileges</p>}
        description={<p>Manage the actions this role can perform within Kibana.</p>}
      >
        <EuiCheckboxGroup
          options={checkboxes}
          idToSelectedMap={selectionMap}
          onChange={this.onKibanaPrivilegesChange}
          disabled={isReservedRole(role)}
        />
      </EuiDescribedFormGroup>
    );
  }

  onKibanaPrivilegesChange = (privilege) => {
    const role = {
      ...this.props.role,
      applications: [...this.props.role.applications]
    };

    togglePrivilege(role, this.props.rbacApplication, this.idToPrivilege(privilege));

    this.props.onChange(role);
  }
}
