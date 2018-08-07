/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint camelcase: 0 */
import { get } from 'lodash';
import React, { Component, Fragment } from 'react';
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
  EuiPage,
  EuiComboBox,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { USERS_PATH } from '../../../views/management/management_urls';
import { ConfirmDelete } from './confirm_delete';
const validEmailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; //eslint-disable-line max-len
const validUsernameRegex = /[a-zA-Z_][a-zA-Z0-9_@\-\$\.]*/;
export class EditUser extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false,
      isNewUser: true,
      currentUser: {},
      showDeleteConfirmation: false,
      user: {
        email: null,
        username: null,
        full_name: null,
        roles: [],
      },
      roles: [],
      selectedRoles: [],
      password: null,
      confirmPassword: null,
    };
  }
  async componentDidMount() {
    const { apiClient, username } = this.props;
    let { user, currentUser } = this.state;
    if (username) {
      try {
        user = await apiClient.getUser(username);
        currentUser = await apiClient.getCurrentUser();
      } catch (err) {
        toastNotifications.addDanger({
          title: `Error loading user`,
          text: get(err, 'data.message') || err.message,
        });
        return;
      }
    }

    let roles;
    try {
      roles = await apiClient.getRoles();
    } catch (err) {
      toastNotifications.addDanger({
        title: `Error loading roles`,
        text: get(err, 'data.message') || err.message,
      });
      return;
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
  handleDelete = (usernames, errors) => {
    if (errors.length === 0) {
      const { changeUrl } = this.props;
      changeUrl(USERS_PATH);
    }
  };
  passwordError = () => {
    const { password } = this.state;
    if (password !== null && password.length < 6) {
      return 'Password must be at least 6 characters';
    }
  };
  currentPasswordError = () => {
    const { currentPasswordError } = this.state;
    if (currentPasswordError) {
      return 'The current password you entered is incorrect';
    }
  };
  confirmPasswordError = () => {
    const { password, confirmPassword } = this.state;
    if (password && confirmPassword !== null && password !== confirmPassword) {
      return 'Passwords do not match';
    }
  };
  usernameError = () => {
    const { username } = this.state.user;
    if (username !== null && !username) {
      return 'Username is required';
    } else if (username && !username.match(validUsernameRegex)) {
      return 'Username must begin with a letter or underscore and contain only letters, underscores, and numbers';
    }
  };
  fullnameError = () => {
    const { full_name } = this.state.user;
    if (full_name !== null && !full_name) {
      return 'Full name is required';
    }
  };
  emailError = () => {
    const { email } = this.state.user;
    if (email !== null && (!email || !email.match(validEmailRegex))) {
      return 'A valid email address is required';
    }
  };
  changePassword = async () => {
    const { apiClient } = this.props;
    const { user, password, currentPassword } = this.state;
    try {
      await apiClient.changePassword(user.username, password, currentPassword);
      toastNotifications.addSuccess('Password changed.');
    } catch (e) {
      if (e.status === 401) {
        return this.setState({ currentPasswordError: true });
      } else {
        toastNotifications.addDanger(`Error setting password: ${e.data.message}`);
      }
    }
    this.clearPasswordForm();
  };
  saveUser = async () => {
    const { apiClient, changeUrl } = this.props;
    const { user, password, selectedRoles } = this.state;
    const userToSave = { ...user };
    userToSave.roles = selectedRoles.map(selectedRole => {
      return selectedRole.label;
    });
    if (password) {
      userToSave.password = password;
    }
    try {
      await apiClient.saveUser(userToSave);
      toastNotifications.addSuccess(`Saved user ${user.username}`);
      changeUrl(USERS_PATH);
    } catch (e) {
      toastNotifications.addDanger(`Error saving user: ${e.data.message}`);
    }
  };
  clearPasswordForm = () => {
    this.setState({
      showChangePasswordForm: false,
      password: null,
      confirmPassword: null,
    });
  };
  passwordFields = () => {
    const { user, currentUser } = this.state;
    const userIsLoggedInUser = user.username && user.username === currentUser.username;
    return (
      <Fragment>
        {userIsLoggedInUser ? (
          <EuiFormRow
            label="Current password"
            isInvalid={!!this.currentPasswordError()}
            error={this.currentPasswordError()}
          >
            <EuiFieldText
              name="currentPassword"
              type="password"
              onChange={event => this.setState({ currentPassword: event.target.value })}
            />
          </EuiFormRow>
        ) : null}
        <EuiFormRow
          label={userIsLoggedInUser ? 'New password' : 'Password'}
          isInvalid={!!this.passwordError()}
          error={this.passwordError()}
        >
          <EuiFieldText
            data-test-subj="passwordInput"
            name="password"
            type="password"
            onChange={event => this.setState({ password: event.target.value })}
            onBlur={event => this.setState({ password: event.target.value || '' })}
          />
        </EuiFormRow>
        <EuiFormRow
          label="Confirm password"
          isInvalid={!!this.confirmPasswordError()}
          error={this.confirmPasswordError()}
        >
          <EuiFieldText
            data-test-subj="passwordConfirmationInput"
            onChange={event => this.setState({ confirmPassword: event.target.value })}
            onBlur={event => this.setState({ confirmPassword: event.target.value || '' })}
            name="confirm_password"
            type="password"
          />
        </EuiFormRow>
      </Fragment>
    );
  };
  changePasswordForm = () => {
    const {
      showChangePasswordForm,
      password,
      confirmPassword,
      user: { username },
    } = this.state;
    if (!showChangePasswordForm) {
      return null;
    }
    return (
      <Fragment>
        <EuiHorizontalRule />
        {this.passwordFields()}
        {username === 'kibana' ? (
          <Fragment>
            <EuiCallOut title="Extra step needed" color="warning" iconType="help">
              <p>
                After you change the password for the kibana user, you must update the kibana.yml
                file and restart Kibana.
              </p>
            </EuiCallOut>
            <EuiSpacer />
          </Fragment>
        ) : null}
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              disabled={
                !password || !confirmPassword || this.passwordError() || this.confirmPasswordError()
              }
              onClick={() => {
                this.changePassword(password);
              }}
            >
              Save password
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={() => {
                this.clearPasswordForm();
              }}
            >
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  };
  toggleChangePasswordForm = () => {
    const { showChangePasswordForm } = this.state;
    this.setState({ showChangePasswordForm: !showChangePasswordForm });
  };
  onRolesChange = selectedRoles => {
    this.setState({
      selectedRoles,
    });
  };
  cannotSaveUser = () => {
    const { user, isNewUser } = this.state;
    return (
      !user.username ||
      !user.full_name ||
      !user.email ||
      this.emailError() ||
      (isNewUser && (this.passwordError() || this.confirmPasswordError()))
    );
  };
  onCancelDelete = () => {
    this.setState({ showDeleteConfirmation: false });
  };
  render() {
    const { changeUrl, apiClient } = this.props;
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
      <EuiPage className="mgtUsersEditPage">
        <EuiPageBody>
          <EuiPageContent className="mgtUsersEditPage__content">
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection>
                <EuiTitle>
                  <h2>{isNewUser ? 'New user' : `Edit "${user.username}" user`}</h2>
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
                    Reserved users are built-in and cannot be removed or modified. Only the password
                    may be changed.
                  </p>
                </EuiText>
              )}

              {showDeleteConfirmation ? (
                <ConfirmDelete
                  onCancel={this.onCancelDelete}
                  apiClient={apiClient}
                  usersToDelete={[user.username]}
                  callback={this.handleDelete}
                />
              ) : null}

              <form
                onSubmit={event => {
                  event.preventDefault();
                }}
              >
                <EuiForm>
                  <EuiFormRow
                    isInvalid={!!this.usernameError()}
                    error={this.usernameError()}
                    helpText={
                      !isNewUser && !reserved
                        ? "Username's cannot be changed after creation."
                        : null
                    }
                    label="Username"
                  >
                    <EuiFieldText
                      onBlur={event =>
                        this.setState({
                          user: {
                            ...this.state.user,
                            username: event.target.value || '',
                          },
                        })
                      }
                      value={user.username || ''}
                      name="username"
                      data-test-subj="userFormUserNameInput"
                      disabled={!isNewUser}
                      onChange={event => {
                        this.setState({
                          user: { ...this.state.user, username: event.target.value },
                        });
                      }}
                    />
                  </EuiFormRow>
                  {isNewUser ? this.passwordFields() : null}
                  {reserved ? null : (
                    <Fragment>
                      <EuiFormRow
                        isInvalid={!!this.fullnameError()}
                        error={this.fullnameError()}
                        label="Full name"
                      >
                        <EuiFieldText
                          onBlur={event =>
                            this.setState({
                              user: {
                                ...this.state.user,
                                full_name: event.target.value || '',
                              },
                            })
                          }
                          data-test-subj="userFormFullNameInput"
                          name="full_name"
                          value={user.full_name || ''}
                          onChange={event => {
                            this.setState({
                              user: {
                                ...this.state.user,
                                full_name: event.target.value,
                              },
                            });
                          }}
                        />
                      </EuiFormRow>
                      <EuiFormRow
                        isInvalid={!!this.emailError()}
                        error={this.emailError()}
                        label="Email address"
                      >
                        <EuiFieldText
                          onBlur={event =>
                            this.setState({
                              user: {
                                ...this.state.user,
                                email: event.target.value || '',
                              },
                            })
                          }
                          data-test-subj="userFormEmailInput"
                          name="email"
                          value={user.email || ''}
                          onChange={event => {
                            this.setState({
                              user: {
                                ...this.state.user,
                                email: event.target.value,
                              },
                            });
                          }}
                        />
                      </EuiFormRow>
                    </Fragment>
                  )}
                  <EuiFormRow label="Roles">
                    <EuiComboBox
                      data-test-subj="userFormRolesDropdown"
                      placeholder="Add roles"
                      onChange={this.onRolesChange}
                      isDisabled={reserved}
                      name="roles"
                      options={roles.map(role => {
                        return { 'data-test-subj': `roleOption-${role.name}`, label: role.name };
                      })}
                      selectedOptions={selectedRoles}
                    />
                  </EuiFormRow>

                  {isNewUser || showChangePasswordForm ? null : (
                    <EuiFormRow label="Password">
                      <EuiLink onClick={this.toggleChangePasswordForm}>Change password</EuiLink>
                    </EuiFormRow>
                  )}
                  {this.changePasswordForm()}

                  <EuiHorizontalRule />

                  {reserved && (
                    <EuiButton onClick={() => changeUrl(USERS_PATH)}>Return to user list</EuiButton>
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
                          {isNewUser ? 'Create user' : 'Update user'}
                        </EuiButton>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          data-test-subj="userFormCancelButton"
                          onClick={() => changeUrl(USERS_PATH)}
                        >
                          Cancel
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
                            Delete user
                          </EuiButtonEmpty>
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  )}
                </EuiForm>
              </form>
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
