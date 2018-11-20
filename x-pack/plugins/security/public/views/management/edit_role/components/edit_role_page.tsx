/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
<<<<<<< HEAD
=======

>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
=======
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { get } from 'lodash';
import React, { ChangeEvent, Component, Fragment, HTMLProps } from 'react';
import { toastNotifications } from 'ui/notify';
import { Space } from '../../../../../../spaces/common/model/space';
import { UserProfile } from '../../../../../../xpack_main/public/services/user_profile';
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
<<<<<<< HEAD
=======
  intl: InjectedIntl;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
}

interface State {
  role: Role;
  formError: RoleValidationResult | null;
}

<<<<<<< HEAD
export class EditRolePage extends Component<Props, State> {
=======
class EditRolePageUI extends Component<Props, State> {
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
    const description = this.props.spacesEnabled
      ? `Set privileges on your Elasticsearch data and control access to your Kibana spaces.`
      : `Set privileges on your Elasticsearch data and control access to Kibana.`;
=======
    const description = this.props.spacesEnabled ? (
      <FormattedMessage
        id="xpack.security.management.editRole.setPrivilegesToKibanaSpacesDescription"
        defaultMessage="Set privileges on your Elasticsearch data and control access to your Kibana spaces."
      />
    ) : (
      <FormattedMessage
        id="xpack.security.management.editRole.setPrivilegesToKibanaDescription"
        defaultMessage="Set privileges on your Elasticsearch data and control access to Kibana."
      />
    );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

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
<<<<<<< HEAD
                    Reserved roles are built-in and cannot be removed or modified.
=======
                    <FormattedMessage
                      id="xpack.security.management.editRole.modifyingReversedRolesDescription"
                      defaultMessage="Reserved roles are built-in and cannot be removed or modified."
                    />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
      titleText = 'Viewing role';
      props['aria-describedby'] = 'reservedRoleDescription';
    } else if (this.editingExistingRole()) {
      titleText = 'Edit role';
    } else {
      titleText = 'Create role';
=======
      titleText = (
        <FormattedMessage
          id="xpack.security.management.editRole.viewingRoleTitle"
          defaultMessage="Viewing role"
        />
      );
      props['aria-describedby'] = 'reservedRoleDescription';
    } else if (this.editingExistingRole()) {
      titleText = (
        <FormattedMessage
          id="xpack.security.management.editRole.editRoleTitle"
          defaultMessage="Edit role"
        />
      );
    } else {
      titleText = (
        <FormattedMessage
          id="xpack.security.management.editRole.createRoleTitle"
          defaultMessage="Create role"
        />
      );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
          label={'Role name'}
          helpText={
            !isReservedRole(this.props.role) && this.editingExistingRole()
              ? "A role's name cannot be changed once it has been created."
              : undefined
=======
          label={
            <FormattedMessage
              id="xpack.security.management.editRole.roleNameFormRowTitle"
              defaultMessage="Role name"
            />
          }
          helpText={
            !isReservedRole(this.props.role) && this.editingExistingRole() ? (
              <FormattedMessage
                id="xpack.security.management.editRole.roleNameFormRowHelpText"
                defaultMessage="A role's name cannot be changed once it has been created."
              />
            ) : (
              undefined
            )
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
      return <EuiButton onClick={this.backToRoleList}>Return to role list</EuiButton>;
    }

    const saveText = this.editingExistingRole() ? 'Update role' : 'Create role';
=======
      return (
        <EuiButton onClick={this.backToRoleList}>
          <FormattedMessage
            id="xpack.security.management.editRole.returnToRoleListButtonLabel"
            defaultMessage="Return to role list"
          />
        </EuiButton>
      );
    }

    const saveText = this.editingExistingRole() ? (
      <FormattedMessage
        id="xpack.security.management.editRole.updateRoleText"
        defaultMessage="Update role"
      />
    ) : (
      <FormattedMessage
        id="xpack.security.management.editRole.createRoleText"
        defaultMessage="Create role"
      />
    );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

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
<<<<<<< HEAD
            Cancel
=======
            <FormattedMessage
              id="xpack.security.management.editRole.cancelButtonLabel"
              defaultMessage="Cancel"
            />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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

<<<<<<< HEAD
      const { httpClient } = this.props;
=======
      const { httpClient, intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

      const role = {
        ...this.state.role,
      };

      role.elasticsearch.indices = role.elasticsearch.indices.filter(
        i => !this.isPlaceholderPrivilege(i)
      );
      role.elasticsearch.indices.forEach(index => index.query || delete index.query);

      saveRole(httpClient, role)
        .then(() => {
<<<<<<< HEAD
          toastNotifications.addSuccess('Saved role');
=======
          toastNotifications.addSuccess(
            intl.formatMessage({
              id: 'xpack.security.management.editRole.roleSuccessfullySavedNotificationMessage',
              defaultMessage: 'Saved role',
            })
          );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          this.backToRoleList();
        })
        .catch((error: any) => {
          toastNotifications.addDanger(get(error, 'data.message'));
        });
    }
  };

  public handleDeleteRole = () => {
<<<<<<< HEAD
    const { httpClient, role } = this.props;

    deleteRole(httpClient, role.name)
      .then(() => {
        toastNotifications.addSuccess('Deleted role');
=======
    const { httpClient, role, intl } = this.props;

    deleteRole(httpClient, role.name)
      .then(() => {
        toastNotifications.addSuccess(
          intl.formatMessage({
            id: 'xpack.security.management.editRole.roleSuccessfullyDeletedNotificationMessage',
            defaultMessage: 'Deleted role',
          })
        );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
=======

export const EditRolePage = injectI18n(EditRolePageUI);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
