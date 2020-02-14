/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import React, { Component, Fragment, ChangeEvent } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiText,
  EuiFieldText,
  EuiComboBox,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { NotificationsStart } from 'src/core/public';
import { User, EditUser, Role } from '../../../../common/model';
import { AuthenticationServiceSetup } from '../../../authentication';
import { USERS_PATH } from '../../management_urls';
import { RolesAPIClient } from '../../roles';
import { ConfirmDeleteUsers, ChangePasswordForm } from '../components';
import { UserValidator, UserValidationResult } from './validate_user';
import { UserAPIClient } from '..';

interface Props {
  username?: string;
  apiClient: PublicMethodsOf<UserAPIClient>;
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
  authc: AuthenticationServiceSetup;
  notifications: NotificationsStart;
}

interface State {
  isLoaded: boolean;
  isNewUser: boolean;
  currentUser: User | null;
  showChangePasswordForm: boolean;
  showDeleteConfirmation: boolean;
  user: EditUser;
  roles: Role[];
  selectedRoles: Array<{ label: string }>;
  formError: UserValidationResult | null;
}

function backToUserList() {
  window.location.hash = USERS_PATH;
}

export class EditUserPage extends Component<Props, State> {
  private validator: UserValidator;

  constructor(props: Props) {
    super(props);
    this.validator = new UserValidator({ shouldValidate: false });
    this.state = {
      isLoaded: false,
      isNewUser: true,
      currentUser: null,
      showChangePasswordForm: false,
      showDeleteConfirmation: false,
      user: {
        email: '',
        username: '',
        full_name: '',
        roles: [],
        enabled: true,
        password: '',
        confirmPassword: '',
      },
      roles: [],
      selectedRoles: [],
      formError: null,
    };
  }

  public async componentDidMount() {
    await this.setCurrentUser();
  }

  public async componentDidUpdate(prevProps: Props) {
    if (prevProps.username !== this.props.username) {
      await this.setCurrentUser();
    }
  }

  private async setCurrentUser() {
    const { username, apiClient, rolesAPIClient, notifications, authc } = this.props;
    let { user, currentUser } = this.state;
    if (username) {
      try {
        user = {
          ...(await apiClient.getUser(username)),
          password: '',
          confirmPassword: '',
        };
        currentUser = await authc.getCurrentUser();
      } catch (err) {
        notifications.toasts.addDanger({
          title: i18n.translate('xpack.security.management.users.editUser.errorLoadingUserTitle', {
            defaultMessage: 'Error loading user',
          }),
          text: get(err, 'body.message') || err.message,
        });
        return backToUserList();
      }
    }

    let roles: Role[] = [];
    try {
      roles = await rolesAPIClient.getRoles();
    } catch (err) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.security.management.users.editUser.errorLoadingRolesTitle', {
          defaultMessage: 'Error loading roles',
        }),
        text: get(err, 'body.message') || err.message,
      });
    }

    this.setState({
      isLoaded: true,
      isNewUser: !username,
      currentUser,
      user,
      roles,
      selectedRoles: user.roles.map(role => ({ label: role })) || [],
    });
  }

  private handleDelete = (usernames: string[], errors: string[]) => {
    if (errors.length === 0) {
      backToUserList();
    }
  };

  private saveUser = async () => {
    this.validator.enableValidation();

    const result = this.validator.validateForSave(this.state.user, this.state.isNewUser);
    if (result.isInvalid) {
      this.setState({
        formError: result,
      });
    } else {
      this.setState({
        formError: null,
      });
      const { apiClient } = this.props;
      const { user, isNewUser, selectedRoles } = this.state;
      const userToSave: EditUser = { ...user };
      if (!isNewUser) {
        delete userToSave.password;
      }
      delete userToSave.confirmPassword;
      userToSave.roles = selectedRoles.map(selectedRole => {
        return selectedRole.label;
      });
      try {
        await apiClient.saveUser(userToSave);
        this.props.notifications.toasts.addSuccess(
          i18n.translate(
            'xpack.security.management.users.editUser.userSuccessfullySavedNotificationMessage',
            {
              defaultMessage: 'Saved user {message}',
              values: { message: user.username },
            }
          )
        );

        backToUserList();
      } catch (e) {
        this.props.notifications.toasts.addDanger(
          i18n.translate('xpack.security.management.users.editUser.savingUserErrorMessage', {
            defaultMessage: 'Error saving user: {message}',
            values: { message: get(e, 'body.message', 'Unknown error') },
          })
        );
      }
    }
  };

  private passwordFields = () => {
    return (
      <Fragment>
        <EuiFormRow
          label={i18n.translate('xpack.security.management.users.editUser.passwordFormRowLabel', {
            defaultMessage: 'Password',
          })}
          {...this.validator.validatePassword(this.state.user)}
        >
          <EuiFieldText
            autoComplete="new-password"
            data-test-subj="passwordInput"
            name="password"
            type="password"
            onChange={this.onPasswordChange}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate(
            'xpack.security.management.users.editUser.confirmPasswordFormRowLabel',
            { defaultMessage: 'Confirm password' }
          )}
          {...this.validator.validateConfirmPassword(this.state.user)}
        >
          <EuiFieldText
            autoComplete="new-password"
            data-test-subj="passwordConfirmationInput"
            onChange={this.onConfirmPasswordChange}
            name="confirm_password"
            type="password"
          />
        </EuiFormRow>
      </Fragment>
    );
  };

  private changePasswordForm = () => {
    const { showChangePasswordForm, user, currentUser } = this.state;

    const userIsLoggedInUser = Boolean(
      currentUser && user.username && user.username === currentUser.username
    );

    if (!showChangePasswordForm) {
      return null;
    }
    return (
      <Fragment>
        <EuiHorizontalRule />
        {user.username === 'kibana' ? (
          <Fragment>
            <EuiCallOut
              title={i18n.translate(
                'xpack.security.management.users.editUser.changePasswordExtraStepTitle',
                { defaultMessage: 'Extra step needed' }
              )}
              color="warning"
              iconType="help"
            >
              <p>
                <FormattedMessage
                  id="xpack.security.management.users.editUser.changePasswordUpdateKibanaTitle"
                  defaultMessage="After you change the password for the kibana user, you must update the {kibana}
                  file and restart Kibana."
                  values={{ kibana: 'kibana.yml' }}
                />
              </p>
            </EuiCallOut>
            <EuiSpacer />
          </Fragment>
        ) : null}
        <ChangePasswordForm
          user={this.state.user}
          isUserChangingOwnPassword={userIsLoggedInUser}
          onChangePassword={this.toggleChangePasswordForm}
          apiClient={this.props.apiClient}
          notifications={this.props.notifications}
        />
      </Fragment>
    );
  };

  private toggleChangePasswordForm = () => {
    const { showChangePasswordForm } = this.state;
    this.setState({ showChangePasswordForm: !showChangePasswordForm });
  };

  private onUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const user = {
      ...this.state.user,
      username: e.target.value || '',
    };
    const formError = this.validator.validateForSave(user, this.state.isNewUser);

    this.setState({
      user,
      formError,
    });
  };

  private onEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const user = {
      ...this.state.user,
      email: e.target.value || '',
    };
    const formError = this.validator.validateForSave(user, this.state.isNewUser);

    this.setState({
      user,
      formError,
    });
  };

  private onFullNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const user = {
      ...this.state.user,
      full_name: e.target.value || '',
    };
    const formError = this.validator.validateForSave(user, this.state.isNewUser);

    this.setState({
      user,
      formError,
    });
  };

  private onPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const user = {
      ...this.state.user,
      password: e.target.value || '',
    };
    const formError = this.validator.validateForSave(user, this.state.isNewUser);

    this.setState({
      user,
      formError,
    });
  };

  private onConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const user = {
      ...this.state.user,
      confirmPassword: e.target.value || '',
    };
    const formError = this.validator.validateForSave(user, this.state.isNewUser);

    this.setState({
      user,
      formError,
    });
  };

  private onRolesChange = (selectedRoles: Array<{ label: string }>) => {
    this.setState({
      selectedRoles,
    });
  };

  private cannotSaveUser = () => {
    const { user, isNewUser } = this.state;
    const result = this.validator.validateForSave(user, isNewUser);
    return result.isInvalid;
  };

  private onCancelDelete = () => {
    this.setState({ showDeleteConfirmation: false });
  };

  public render() {
    const {
      user,
      roles,
      selectedRoles,
      showChangePasswordForm,
      isNewUser,
      showDeleteConfirmation,
    } = this.state;
    const reserved = user.metadata && user.metadata._reserved;
    if (!user || !roles) {
      return null;
    }

    if (!this.state.isLoaded) {
      return null;
    }

    return (
      <div className="secUsersEditPage">
        <EuiPageContent className="secUsersEditPage__content">
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle>
                <h1>
                  {isNewUser ? (
                    <FormattedMessage
                      id="xpack.security.management.users.editUser.newUserTitle"
                      defaultMessage="New user"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.security.management.users.editUser.editUserTitle"
                      defaultMessage="Edit {userName} user"
                      values={{ userName: user.username }}
                    />
                  )}
                </h1>
              </EuiTitle>
            </EuiPageContentHeaderSection>
            {reserved && (
              <EuiPageContentHeaderSection>
                <EuiIcon type="lock" size="l" color="subdued" />
              </EuiPageContentHeaderSection>
            )}
          </EuiPageContentHeader>
          <EuiPageContentBody>
            {reserved && (
              <EuiText size="s" color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.security.management.users.editUser.modifyingReservedUsersDescription"
                    defaultMessage="Reserved users are built-in and cannot be removed or modified. Only the password
                    may be changed."
                  />
                </p>
              </EuiText>
            )}

            {showDeleteConfirmation ? (
              <ConfirmDeleteUsers
                onCancel={this.onCancelDelete}
                usersToDelete={[user.username]}
                callback={this.handleDelete}
                apiClient={this.props.apiClient}
                notifications={this.props.notifications}
              />
            ) : null}

            <EuiForm {...this.state.formError}>
              <EuiFormRow
                {...this.validator.validateUsername(this.state.user)}
                helpText={
                  !isNewUser && !reserved
                    ? i18n.translate(
                        'xpack.security.management.users.editUser.changingUserNameAfterCreationDescription',
                        { defaultMessage: `Usernames can't be changed after creation.` }
                      )
                    : null
                }
                label={i18n.translate(
                  'xpack.security.management.users.editUser.usernameFormRowLabel',
                  { defaultMessage: 'Username' }
                )}
              >
                <EuiFieldText
                  value={user.username || ''}
                  name="username"
                  data-test-subj="userFormUserNameInput"
                  disabled={!isNewUser}
                  onChange={this.onUsernameChange}
                />
              </EuiFormRow>
              {isNewUser ? this.passwordFields() : null}
              {reserved ? null : (
                <Fragment>
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.security.management.users.editUser.fullNameFormRowLabel',
                      { defaultMessage: 'Full name' }
                    )}
                  >
                    <EuiFieldText
                      data-test-subj="userFormFullNameInput"
                      name="full_name"
                      value={user.full_name || ''}
                      onChange={this.onFullNameChange}
                    />
                  </EuiFormRow>
                  <EuiFormRow
                    {...this.validator.validateEmail(this.state.user)}
                    label={i18n.translate(
                      'xpack.security.management.users.editUser.emailAddressFormRowLabel',
                      { defaultMessage: 'Email address' }
                    )}
                  >
                    <EuiFieldText
                      data-test-subj="userFormEmailInput"
                      name="email"
                      value={user.email || ''}
                      onChange={this.onEmailChange}
                    />
                  </EuiFormRow>
                </Fragment>
              )}
              <EuiFormRow
                label={i18n.translate(
                  'xpack.security.management.users.editUser.rolesFormRowLabel',
                  { defaultMessage: 'Roles' }
                )}
              >
                <EuiComboBox
                  data-test-subj="userFormRolesDropdown"
                  placeholder={i18n.translate(
                    'xpack.security.management.users.editUser.addRolesPlaceholder',
                    { defaultMessage: 'Add roles' }
                  )}
                  onChange={this.onRolesChange}
                  isDisabled={reserved}
                  options={roles.map(role => {
                    return { 'data-test-subj': `roleOption-${role.name}`, label: role.name };
                  })}
                  selectedOptions={selectedRoles}
                />
              </EuiFormRow>

              {isNewUser || showChangePasswordForm ? null : (
                <EuiFormRow label="Password">
                  <EuiLink onClick={this.toggleChangePasswordForm}>
                    <FormattedMessage
                      id="xpack.security.management.users.editUser.changePasswordButtonLabel"
                      defaultMessage="Change password"
                    />
                  </EuiLink>
                </EuiFormRow>
              )}
              {this.changePasswordForm()}

              <EuiHorizontalRule />

              {reserved && (
                <EuiButton onClick={backToUserList}>
                  <FormattedMessage
                    id="xpack.security.management.users.editUser.returnToUserListButtonLabel"
                    defaultMessage="Return to user list"
                  />
                </EuiButton>
              )}
              {reserved ? null : (
                <EuiFlexGroup responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      disabled={this.cannotSaveUser()}
                      fill
                      data-test-subj="userFormSaveButton"
                      onClick={() => this.saveUser()}
                    >
                      {isNewUser ? (
                        <FormattedMessage
                          id="xpack.security.management.users.editUser.createUserButtonLabel"
                          defaultMessage="Create user"
                        />
                      ) : (
                        <FormattedMessage
                          id="xpack.security.management.users.editUser.updateUserButtonLabel"
                          defaultMessage="Update user"
                        />
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty data-test-subj="userFormCancelButton" onClick={backToUserList}>
                      <FormattedMessage
                        id="xpack.security.management.users.editUser.cancelButtonLabel"
                        defaultMessage="Cancel"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={true} />
                  {isNewUser || reserved ? null : (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        onClick={() => {
                          this.setState({ showDeleteConfirmation: true });
                        }}
                        data-test-subj="userFormDeleteButton"
                        color="danger"
                      >
                        <FormattedMessage
                          id="xpack.security.management.users.editUser.deleteUserButtonLabel"
                          defaultMessage="Delete user"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              )}
            </EuiForm>
          </EuiPageContentBody>
        </EuiPageContent>
      </div>
    );
  }
}
