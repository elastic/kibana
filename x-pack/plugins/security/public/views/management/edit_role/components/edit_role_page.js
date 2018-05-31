/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { toastNotifications } from 'ui/notify';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiPage,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { PageHeader } from './page_header';
import { saveRole, deleteRole } from '../../../../objects';
import { isReservedRole } from '../../../../lib/role';
import { RoleValidator } from '../lib/validate_role';
import { ReservedRoleBadge } from './reserved_role_badge';
import { ROLES_PATH } from '../../management_urls';
import { DeleteRoleButton } from './delete_role_button';
import { ElasticsearchPrivileges, KibanaPrivileges } from './privileges';

export class EditRolePage extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    runAsUsers: PropTypes.array.isRequired,
    indexPatterns: PropTypes.array.isRequired,
    httpClient: PropTypes.func.isRequired,
    rbacEnabled: PropTypes.bool.isRequired,
    rbacApplication: PropTypes.string,
    allowDocumentLevelSecurity: PropTypes.bool.isRequired,
    allowFieldLevelSecurity: PropTypes.bool.isRequired,
    kibanaAppPrivileges: PropTypes.array.isRequired,
    notifier: PropTypes.func.isRequired,
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
      <div>
        <PageHeader breadcrumbs={this.props.breadcrumbs} />
        <EuiPage className="editRolePage">
          <EuiForm {...this.state.formError}>
            {this.getFormTitle()}

            <EuiSpacer />

            {this.getRoleName()}

            {this.getElasticsearchPrivileges()}

            {this.getKibanaPrivileges()}

            <EuiSpacer />

            {this.getFormButtons()}
          </EuiForm>
        </EuiPage>
      </div>
    );
  }

  getFormTitle = () => {
    let titleText;
    if (isReservedRole(this.props.role)) {
      titleText = 'Reserved role';
    } else if (this.editingExistingRole()) {
      titleText = 'Edit role';
    } else {
      titleText = 'New role';
    }

    return (
      <EuiTitle size="l"><h1>{titleText} <ReservedRoleBadge role={this.props.role} /></h1></EuiTitle>
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
      <EuiPanel>
        <EuiFormRow
          label={'Role name'}
          helpText={
            !isReservedRole(this.props.role) && this.editingExistingRole() ?
              "A role's name cannot be changed once it has been created." : undefined
          }
          {...this.validator.validateRoleName(this.state.role)}
        >

          <EuiFieldText
            name={'name'}
            value={this.state.role.name || ''}
            onChange={this.onNameChange}
            readOnly={isReservedRole(this.props.role) || this.editingExistingRole()}
          />
        </EuiFormRow>
      </EuiPanel>
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
      <div>
        <EuiSpacer />
        <ElasticsearchPrivileges
          role={this.state.role}
          editable={!isReservedRole(this.state.role)}
          httpClient={this.props.httpClient}
          onChange={this.onRoleChange}
          runAsUsers={this.props.runAsUsers}
          validator={this.validator}
          indexPatterns={this.props.indexPatterns}
          allowDocumentLevelSecurity={this.props.allowDocumentLevelSecurity}
          allowFieldLevelSecurity={this.props.allowFieldLevelSecurity}
        />
      </div>
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
      <div>
        <EuiSpacer />
        <KibanaPrivileges
          kibanaAppPrivileges={this.props.kibanaAppPrivileges}
          rbacApplication={this.props.rbacApplication}
          role={this.state.role}
          onChange={this.onRoleChange}
        />
      </div>
    );
  };

  getFormButtons = () => {
    if (isReservedRole(this.props.role)) {
      return (
        <EuiButton onClick={this.backToRoleList}>
          Return to role list
        </EuiButton>
      );
    }

    const saveText = this.editingExistingRole() ? 'Update role' : 'Create role';

    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={this.saveRole} disabled={isReservedRole(this.props.role)}>{saveText}</EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={this.backToRoleList}>
            Cancel
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={true} />
        {this.getActionButton()}
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
        notifier,
      } = this.props;

      const role = {
        ...this.state.role
      };

      role.indices = role.indices.filter(i => !this.isPlaceholderPrivilege(i));
      role.indices.forEach((index) => index.query || delete index.query);

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
      notifier,
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
