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
          <EuiPageContent className="editRolePage__content">
            <EuiForm {...this.state.formError}>
              {this.getFormTitle()}

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
      <EuiPanel>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label={'Role name'} {...this.validator.validateRoleName(this.state.role)}>
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
    if (isReservedRole(this.props.role)) {
      return (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={this.backToRoleList}>
              Return to role list
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    const saveText = this.editingExistingRole() ? 'Update role' : 'Create role';

    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={this.saveRole} disabled={isReservedRole(this.props.role)}>{saveText}</EuiButton>
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
