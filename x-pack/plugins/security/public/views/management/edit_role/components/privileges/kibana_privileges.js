/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { isReservedRole } from '../../../../../lib/role';
import { getKibanaPrivileges } from '../../lib/get_application_privileges';
import { togglePrivilege } from '../../lib/set_application_privileges';
import {
  EuiCheckboxGroup,
  EuiText,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
export class KibanaPrivileges extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    kibanaAppPrivileges: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  idPrefix = () => `${this.props.rbacApplication}_`;

  privilegeToId = (privilege) => `${this.idPrefix()}${privilege}`;

  idToPrivilege = (id) => id.split(this.idPrefix())[1];

  render() {

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
      <Fragment>
        <EuiTitle>
          <h3>Kibana</h3>
        </EuiTitle>

        <EuiSpacer />

        <EuiText>
          <p>
            Manage the actions this role can perform against Kibana.&nbsp;
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiCheckboxGroup
          options={checkboxes}
          idToSelectedMap={selectionMap}
          onChange={this.onKibanaPrivilegesChange}
          disabled={isReservedRole(role)}
        />
      </Fragment>
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
