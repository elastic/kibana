/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiForm,
  EuiFormRow,
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { get } from 'lodash';
import React, { ChangeEvent, Component, Fragment, HTMLProps } from 'react';
import { toastNotifications } from 'ui/notify';
import { Space } from '../../../../../../spaces/common/model/space';
import { UserProfile } from '../../../../../../xpack_main/common/user_profile';
import { IndexPrivilege } from '../../../../../common/model/index_privilege';
import { KibanaPrivilege } from '../../../../../common/model/kibana_privilege';
import { Role } from '../../../../../common/model/role';
import { isReservedRole } from '../../../../lib/role';
import { deleteRole, saveRole } from '../../../../objects';
import { ROLES_PATH } from '../../management_urls';
import { RoleValidationResult, RoleValidator } from '../lib/validate_role';
import { DeleteRoleButton } from './delete_role_button';
import { ElasticsearchPrivileges, KibanaPrivileges } from './privileges';
import { ReservedRoleBadge } from './reserved_role_badge';

interface Props {
  role: Role;
  runAsUsers: string[];
  indexPatterns: string[];
  httpClient: any;
  rbacEnabled: boolean;
  allowDocumentLevelSecurity: boolean;
  allowFieldLevelSecurity: boolean;
  kibanaAppPrivileges: KibanaPrivilege[];
  spaces?: Space[];
  spacesEnabled: boolean;
  userProfile: UserProfile;
}

interface State {
  role: Role;
  formError: RoleValidationResult | null;
}

export class EditRolePage extends Component<Props, State> {
  private validator: RoleValidator;

  constructor(props: Props) {
    super(props);
    this.state = {
      role: props.role,
      formError: null,
    };
    this.validator = new RoleValidator({ shouldValidate: false });
  }

  public render() {
    const description = this.props.spacesEnabled
      ? `Set privileges on your Elasticsearch data and control access to your Kibana spaces.`
      : `Set privileges on your Elasticsearch data and control access to Kibana.`;

    return (
      <EuiPage className="editRolePage" restrictWidth>
        <EuiPageBody>
          <EuiForm {...this.state.formError}>
            {this.getFormTitle()}

            <EuiSpacer />

            <EuiText size="s">{description}</EuiText>

            {isReservedRole(this.props.role) && (
              <Fragment>
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  <p id="reservedRoleDescription" tabIndex={1}>
                    Reserved roles are built-in and cannot be removed or modified.
                  </p>
                </EuiText>
              </Fragment>
            )}

            <EuiSpacer />

            {this.getRoleName()}

            {this.getElasticsearchPrivileges()}

            {this.getKibanaPrivileges()}

            <EuiSpacer />

            {this.getFormButtons()}
          </EuiForm>
        </EuiPageBody>
      </EuiPage>
    );
  }

  public getFormTitle = () => {
    let titleText;
    const props: HTMLProps<HTMLDivElement> = {
      tabIndex: 0,
    };
    if (isReservedRole(this.props.role)) {
      titleText = 'Viewing role';
      props['aria-describedby'] = 'reservedRoleDescription';
    } else if (this.editingExistingRole()) {
      titleText = 'Edit role';
    } else {
      titleText = 'Create role';
    }

    return (
      <EuiTitle size="l">
        <h1 {...props}>
          {titleText} <ReservedRoleBadge role={this.props.role} />
        </h1>
      </EuiTitle>
    );
  };

  public getActionButton = () => {
    if (this.editingExistingRole() && !isReservedRole(this.props.role)) {
      return (
        <EuiFlexItem grow={false}>
          <DeleteRoleButton canDelete={true} onDelete={this.handleDeleteRole} />
        </EuiFlexItem>
      );
    }

    return null;
  };

  public getRoleName = () => {
    return (
      <EuiPanel>
        <EuiFormRow
          label={'Role name'}
          helpText={
            !isReservedRole(this.props.role) && this.editingExistingRole()
              ? "A role's name cannot be changed once it has been created."
              : undefined
          }
          {...this.validator.validateRoleName(this.state.role)}
        >
          <EuiFieldText
            name={'name'}
            value={this.state.role.name || ''}
            onChange={this.onNameChange}
            data-test-subj={'roleFormNameInput'}
            readOnly={isReservedRole(this.props.role) || this.editingExistingRole()}
          />
        </EuiFormRow>
      </EuiPanel>
    );
  };

  public onNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const name = rawValue.replace(/\s/g, '_');

    this.setState({
      role: {
        ...this.state.role,
        name,
      },
    });
  };

  public getElasticsearchPrivileges() {
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

  public onRoleChange = (role: Role) => {
    this.setState({
      role,
    });
  };

  public getKibanaPrivileges = () => {
    return (
      <div>
        <EuiSpacer />
        <KibanaPrivileges
          kibanaAppPrivileges={this.props.kibanaAppPrivileges}
          spaces={this.props.spaces}
          spacesEnabled={this.props.spacesEnabled}
          userProfile={this.props.userProfile}
          editable={!isReservedRole(this.state.role)}
          role={this.state.role}
          onChange={this.onRoleChange}
          validator={this.validator}
        />
      </div>
    );
  };

  public getFormButtons = () => {
    if (isReservedRole(this.props.role)) {
      return <EuiButton onClick={this.backToRoleList}>Return to role list</EuiButton>;
    }

    const saveText = this.editingExistingRole() ? 'Update role' : 'Create role';

    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj={`roleFormSaveButton`}
            fill
            onClick={this.saveRole}
            disabled={isReservedRole(this.props.role)}
          >
            {saveText}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty data-test-subj={`roleFormCancelButton`} onClick={this.backToRoleList}>
            Cancel
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={true} />
        {this.getActionButton()}
      </EuiFlexGroup>
    );
  };

  public editingExistingRole = () => {
    return !!this.props.role.name;
  };

  public isPlaceholderPrivilege = (indexPrivilege: IndexPrivilege) => {
    return indexPrivilege.names.length === 0;
  };

  public saveRole = () => {
    this.validator.enableValidation();

    const result = this.validator.validateForSave(this.state.role);
    if (result.isInvalid) {
      this.setState({
        formError: result,
      });
    } else {
      this.setState({
        formError: null,
      });

      const { httpClient } = this.props;

      const role = {
        ...this.state.role,
      };

      role.elasticsearch.indices = role.elasticsearch.indices.filter(
        i => !this.isPlaceholderPrivilege(i)
      );
      role.elasticsearch.indices.forEach(index => index.query || delete index.query);

      saveRole(httpClient, role)
        .then(() => {
          toastNotifications.addSuccess('Saved role');
          this.backToRoleList();
        })
        .catch((error: any) => {
          toastNotifications.addDanger(get(error, 'data.message'));
        });
    }
  };

  public handleDeleteRole = () => {
    const { httpClient, role } = this.props;

    deleteRole(httpClient, role.name)
      .then(() => {
        toastNotifications.addSuccess('Deleted role');
        this.backToRoleList();
      })
      .catch((error: any) => {
        toastNotifications.addDanger(get(error, 'data.message'));
      });
  };

  public backToRoleList = () => {
    window.location.hash = ROLES_PATH;
  };
}
