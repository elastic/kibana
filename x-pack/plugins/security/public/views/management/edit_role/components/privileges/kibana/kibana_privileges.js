/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { CollapsiblePanel } from '../../collapsible_panel';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
} from '@elastic/eui';
import { StandardPrivilegeForm } from './standard_privilege_form';
import { SpaceAwarePrivilegeForm } from './space_aware_privilege_form';

export class KibanaPrivileges extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    spaces: PropTypes.array,
    spacesEnabled: PropTypes.bool.isRequired,
    editable: PropTypes.bool.isRequired,
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

    return this.getSpaceEnabledPrivilegeForm();

    const {
      spacesEnabled,
    } = this.props;

    let form;
    if (spacesEnabled) {
      form = this.getSpaceEnabledPrivilegeForm();
    } else {
      form = this.getStandardPrivilegeForm();
    }

    return (
      <EuiDescribedFormGroup
        title={<p>Application privileges</p>}
        description={<p>Manage the actions this role can perform within Kibana.</p>}
      >
        <EuiFormRow hasEmptyLabelSpace>
          {form}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  getSpaceEnabledPrivilegeForm = () => {
    const {
      kibanaAppPrivileges,
      role,
      rbacApplication,
      spaces = [],
      onChange,
      editable,
    } = this.props;

    return (
      <SpaceAwarePrivilegeForm
        kibanaAppPrivileges={kibanaAppPrivileges}
        role={role}
        rbacApplication={rbacApplication}
        spaces={spaces}
        onChange={onChange}
        editable={editable}
      />
    );
  }

  getStandardPrivilegeForm = () => {
    const {
      kibanaAppPrivileges,
      role,
      rbacApplication,
      onChange,
    } = this.props;

    return (
      <StandardPrivilegeForm
        role={role}
        kibanaAppPrivileges={kibanaAppPrivileges}
        rbacApplication={rbacApplication}
        onChange={onChange}
      />
    );
  }

  _copyRole = () => {
    const role = {
      ...this.props.role,
      applications: [...this.props.role.applications]
    };
    return role;
  }
}
