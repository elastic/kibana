/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Notifier, toastNotifications } from 'ui/notify';
import {
  EuiText,
  EuiSpacer,
  EuiPage,
  EuiPageContent,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { PageHeader } from './page_header';
import { saveRole, deleteRole } from '../../../../objects';
import { isReservedRole } from '../lib/is_reserved_role';
import { RoleValidator } from '../lib/validate_role';
import { ReservedRoleBadge } from './reserved_role_badge';
import { ROLES_PATH } from '../../management_urls';
import { DeleteRoleButton } from './delete_role_button';
import { setApplicationPrivileges } from '../lib/set_application_privileges';
import { ElasticsearchPrivileges, KibanaPrivileges } from './privileges';

const notifier = new Notifier();

export class EditRolePage extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    runAsUsers: PropTypes.array.isRequired,
    indexPatterns: PropTypes.array.isRequired,
    httpClient: PropTypes.func.isRequired,
    rbacEnabled: PropTypes.bool.isRequired,
    rbacApplication: PropTypes.string,
    spacesEnabled: PropTypes.bool.isRequired,
    allowDocumentLevelSecurity: PropTypes.bool.isRequired,
    allowFieldLevelSecurity: PropTypes.bool.isRequired,
    kibanaAppPrivileges: PropTypes.array.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      role: props.role,
      formError: null
    };
    this.validator = new RoleValidator({ shouldValidate: false });
  }

  render() {
    return (
      <EuiPage>
        <PageHeader breadcrumbs={this.props.breadcrumbs} />
        <EuiPageContent>
          <EuiForm {...this.state.formError}>

            <EuiSpacer />

            {this.getRoleName()}

            <EuiSpacer />

            {this.getElasticsearchPrivileges()}

            <EuiSpacer />

            {this.getKibanaPrivileges()}

            <EuiSpacer size={'xl'} />

            {this.getFormButtons()}
          </EuiForm>
        </EuiPageContent>
      </EuiPage>
    );
  }

  getFormTitle = () => {
    const titleText = this.editingExistingRole()
      ? 'Edit Role'
      : 'New Role';

    return (
      <EuiFlexGroup justifyContent={'spaceBetween'}>
        <EuiFlexItem grow={false}>
          <EuiText><h1>{titleText}</h1></EuiText>
        </EuiFlexItem>
        {this.getActionButton()}
      </EuiFlexGroup>
    );
  };

  getActionButton = () => {
    if (this.editingExistingRole() && !isReservedRole(this.props.role)) {
      return (
        <EuiFlexItem grow={false}>
          <DeleteRoleButton canDelete={true} onDelete={this.handleDeleteRole} />
        </EuiFlexItem>
      );
    }

    return null;
  };

  getRoleName = () => {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label={'Name'} {...this.validator.validateRoleName(this.state.role)}>
            <EuiFieldText
              name={'name'}
              value={this.state.role.name || ''}
              onChange={this.onNameChange}
              readOnly={isReservedRole(this.props.role) || this.editingExistingRole()}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <ReservedRoleBadge role={this.props.role} />
      </EuiFlexGroup>
    );
  }

  onNameChange = (e) => {
    const rawValue = e.target.value;
    const name = rawValue.replace(/\s/g, '-');

    this.setState({
      role: {
        ...this.state.role,
        name
      }
    });
  }

  getElasticsearchPrivileges() {
    return (
      <ElasticsearchPrivileges
        role={this.state.role}
        httpClient={this.props.httpClient}
        onChange={this.onRoleChange}
        runAsUsers={this.props.runAsUsers}
        validator={this.validator}
        indexPatterns={this.props.indexPatterns}
        allowDocumentLevelSecurity={this.props.allowDocumentLevelSecurity}
        allowFieldLevelSecurity={this.props.allowFieldLevelSecurity}
      />
    );
  }

  onRoleChange = (role) => {
    this.setState({
      role
    });
  }

  getKibanaPrivileges = () => {
    if (!this.props.rbacEnabled) {
      return null;
    }

    return (
      <KibanaPrivileges
        kibanaAppPrivileges={this.props.kibanaAppPrivileges}
        rbacApplication={this.props.rbacApplication}
        role={this.state.role}
        onChange={this.onRoleChange}
      />
    );
  };

  getFormButtons = () => {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={this.saveRole} disabled={isReservedRole(this.props.role)}>Save</EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={this.backToRoleList}>
            Cancel
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  editingExistingRole = () => {
    return !!this.props.role.name;
  };

  isPlaceholderPrivilege = (indexPrivilege) => {
    return indexPrivilege.names.length === 0;
  };

  saveRole = () => {
    this.validator.enableValidation();

    const result = this.validator.validateForSave(this.state.role);
    if (result.isInvalid) {
      this.setState({
        formError: result
      });
    } else {
      this.setState({
        formError: null
      });

      const {
        httpClient,
      } = this.props;

      const role = {
        ...this.state.role
      };

      role.indices = role.indices.filter(i => !this.isPlaceholderPrivilege(i));
      role.indices.forEach((index) => index.query || delete index.query);

      setApplicationPrivileges(this.props.kibanaPrivileges, role, this.props.rbacApplication);

      saveRole(httpClient, role)
        .then(() => {
          toastNotifications.addSuccess('Saved role');
          this.backToRoleList();
        })
        .catch(error => {
          notifier.error(get(error, 'data.message'));
        });
    }
  };

  handleDeleteRole = () => {
    const {
      httpClient,
      role,
    } = this.props;

    deleteRole(httpClient, role.name)
      .then(() => {
        toastNotifications.addSuccess('Deleted role');
        this.backToRoleList();
      })
      .catch(error => {
        notifier.error(get(error, 'data.message'));
      });
  };

  backToRoleList = () => {
    window.location.hash = ROLES_PATH;
  };
}
