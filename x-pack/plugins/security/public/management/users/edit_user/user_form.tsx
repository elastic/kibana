/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useEffect, useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { throttle } from 'lodash';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { User, Role, isRoleDeprecated } from '../../../../common/model';
import { NAME_REGEX, MAX_NAME_LENGTH } from '../../../../common/constants';
import { useForm, ValidationErrors } from '../../../components/use_form';
import { DocLink } from '../../../components/doc_link';
import { RolesAPIClient } from '../../roles';
import { RoleComboBox } from '../../role_combo_box';
import { UserAPIClient } from '..';

export const THROTTLE_USERS_WAIT = 10000;

export interface UserFormValues {
  username?: string;
  full_name: string;
  email: string;
  password?: string;
  confirm_password?: string;
  roles: readonly string[];
}

export interface UserFormProps {
  isNewUser?: boolean;
  isReservedUser?: boolean;
  isCurrentUser?: boolean;
  defaultValues?: UserFormValues;
  onCancel(): void;
  onSuccess?(): void;
}

const defaultDefaultValues: UserFormValues = {
  username: '',
  password: '',
  confirm_password: '',
  full_name: '',
  email: '',
  roles: [],
};

export const UserForm: FunctionComponent<UserFormProps> = ({
  isNewUser = false,
  isReservedUser = false,
  defaultValues = defaultDefaultValues,
  onSuccess,
  onCancel,
}) => {
  const { services } = useKibana();

  const [rolesState, getRoles] = useAsyncFn(() => new RolesAPIClient(services.http!).getRoles(), [
    services.http,
  ]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getUsersThrottled = useCallback(
    throttle(() => new UserAPIClient(services.http!).getUsers(), THROTTLE_USERS_WAIT),
    [services.http]
  );

  const [form, eventHandlers] = useForm({
    onSubmit: async (values) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { password, confirm_password, ...rest } = values;
      const user = isNewUser ? { password, ...rest } : rest;
      try {
        await new UserAPIClient(services.http!).saveUser(user as User);
        services.notifications!.toasts.addSuccess(
          isNewUser
            ? i18n.translate('xpack.security.management.users.userForm.createSuccessMessage', {
                defaultMessage: "Created user '{username}'",
                values: { username: user.username },
              })
            : i18n.translate('xpack.security.management.users.userForm.updateSuccessMessage', {
                defaultMessage: "Updated user '{username}'",
                values: { username: user.username },
              })
        );
        onSuccess?.();
      } catch (error) {
        services.notifications!.toasts.addDanger({
          title: isNewUser
            ? i18n.translate('xpack.security.management.users.userForm.createErrorMessage', {
                defaultMessage: "Could not create user '{username}'",
                values: { username: user.username },
              })
            : i18n.translate('xpack.security.management.users.userForm.updateErrorMessage', {
                defaultMessage: "Could not update user '{username}'",
                values: { username: user.username },
              }),
          text: (error as any).body?.message || error.message,
        });
        throw error;
      }
    },
    validate: async (values) => {
      const errors: ValidationErrors<typeof values> = {};

      if (isNewUser) {
        if (!values.username) {
          errors.username = i18n.translate(
            'xpack.security.management.users.userForm.usernameRequiredError',
            {
              defaultMessage: 'Enter a username.',
            }
          );
        } else if (values.username.length > MAX_NAME_LENGTH) {
          errors.username = i18n.translate(
            'xpack.security.management.users.userForm.usernameMaxLengthError',
            {
              defaultMessage: 'Username must not exceed {maxLength} characters.',
              values: { maxLength: MAX_NAME_LENGTH },
            }
          );
        } else if (values.username.trim() !== values.username) {
          errors.username = i18n.translate(
            'xpack.security.management.users.userForm.usernameWhitespaceError',
            {
              defaultMessage: `Username must not contain leading or trailing spaces.`,
            }
          );
        } else if (!values.username.match(NAME_REGEX)) {
          errors.username = i18n.translate(
            'xpack.security.management.users.userForm.usernameInvalidError',
            {
              defaultMessage:
                'Username must contain only letters, numbers, spaces, punctuation, and symbols.',
            }
          );
        } else {
          try {
            const users = await getUsersThrottled();
            if (users.some((user) => user.username === values.username)) {
              errors.username = i18n.translate(
                'xpack.security.management.users.userForm.usernameTakenError',
                {
                  defaultMessage: "User '{username}' already exists.",
                  values: { username: values.username },
                }
              );
            }
          } catch (error) {} // eslint-disable-line no-empty
        }

        if (!values.password) {
          errors.password = i18n.translate(
            'xpack.security.management.users.userForm.passwordRequiredError',
            {
              defaultMessage: 'Enter a password.',
            }
          );
        } else if (values.password.length < 6) {
          errors.password = i18n.translate(
            'xpack.security.management.users.userForm.passwordInvalidError',
            {
              defaultMessage: 'Password must be at least 6 characters.',
            }
          );
        } else if (!values.confirm_password) {
          errors.confirm_password = i18n.translate(
            'xpack.security.management.users.userForm.confirmPasswordRequiredError',
            {
              defaultMessage: 'Passwords do not match.',
            }
          );
        } else if (values.password !== values.confirm_password) {
          errors.confirm_password = i18n.translate(
            'xpack.security.management.users.userForm.confirmPasswordInvalidError',
            {
              defaultMessage: 'Passwords do not match.',
            }
          );
        }
      }

      return errors;
    },
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getRoles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const availableRoles = rolesState.value ?? [];
  const selectedRoleNames = form.values.roles ?? [];
  const deprecatedRoles = selectedRoleNames.reduce<Role[]>((roles, name) => {
    const role = availableRoles.find((r) => r.name === name);
    if (role && isRoleDeprecated(role)) {
      roles.push(role);
    }
    return roles;
  }, []);

  return (
    <EuiForm
      component="form"
      error={Object.values(form.errors)}
      isInvalid={form.isInvalid}
      invalidCallout={form.isSubmitted ? 'above' : 'none'}
      onSubmit={eventHandlers.onSubmit}
      noValidate
    >
      <EuiDescribedFormGroup
        title={
          <h2>
            <FormattedMessage
              id="xpack.security.management.users.userForm.profileTitle"
              defaultMessage="Profile"
            />
          </h2>
        }
        description={i18n.translate('xpack.security.management.users.userForm.profileDescription', {
          defaultMessage: 'Provide personal details.',
        })}
      >
        <EuiFormRow
          label={i18n.translate('xpack.security.management.users.userForm.usernameLabel', {
            defaultMessage: 'Username',
          })}
          helpText={
            !isNewUser && !isReservedUser
              ? i18n.translate(
                  'xpack.security.management.users.userForm.changingUserNameAfterCreationDescription',
                  { defaultMessage: `Username can't be changed once created.` }
                )
              : undefined
          }
          error={form.errors.username}
          isInvalid={form.touched.username && !!form.errors.username}
        >
          <EuiFieldText
            name="username"
            icon="user"
            value={form.values.username}
            isLoading={form.isValidating}
            isInvalid={form.touched.username && !!form.errors.username}
            disabled={!isNewUser}
            onChange={eventHandlers.onChange}
            onBlur={eventHandlers.onBlur}
          />
        </EuiFormRow>

        {!isReservedUser ? (
          <>
            <EuiFormRow
              label={i18n.translate('xpack.security.management.users.userForm.fullNameLabel', {
                defaultMessage: 'Full name',
              })}
              error={form.errors.full_name}
              isInvalid={form.touched.full_name && !!form.errors.full_name}
            >
              <EuiFieldText
                name="full_name"
                value={form.values.full_name}
                isInvalid={form.touched.full_name && !!form.errors.full_name}
                onChange={eventHandlers.onChange}
                onBlur={eventHandlers.onBlur}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate('xpack.security.management.users.userForm.emailLabel', {
                defaultMessage: 'Email address',
              })}
              error={form.errors.email}
              isInvalid={form.touched.email && !!form.errors.email}
            >
              <EuiFieldText
                name="email"
                value={form.values.email}
                isInvalid={form.touched.email && !!form.errors.email}
                onChange={eventHandlers.onChange}
                onBlur={eventHandlers.onBlur}
              />
            </EuiFormRow>
          </>
        ) : undefined}
      </EuiDescribedFormGroup>

      {isNewUser ? (
        <EuiDescribedFormGroup
          title={
            <h2>
              <FormattedMessage
                id="xpack.security.management.users.userForm.passwordTitle"
                defaultMessage="Password"
              />
            </h2>
          }
          description={i18n.translate(
            'xpack.security.management.users.userForm.passwordDescription',
            {
              defaultMessage: 'Protect your data with a strong password.',
            }
          )}
        >
          <EuiFormRow
            label={i18n.translate('xpack.security.management.users.userForm.passwordLabel', {
              defaultMessage: 'Password',
            })}
            helpText={i18n.translate('xpack.security.management.users.userForm.passwordHelpText', {
              defaultMessage: 'Password must be at least 6 characters.',
            })}
            error={form.errors.password}
            isInvalid={form.touched.password && !!form.errors.password}
          >
            <EuiFieldPassword
              name="password"
              type="dual"
              value={form.values.password}
              isInvalid={form.touched.password && !!form.errors.password}
              autoComplete="new-password"
              onChange={eventHandlers.onChange}
              onBlur={eventHandlers.onBlur}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.security.management.users.userForm.confirmPasswordLabel', {
              defaultMessage: 'Confirm password',
            })}
            error={form.errors.confirm_password}
            isInvalid={form.touched.confirm_password && !!form.errors.confirm_password}
          >
            <EuiFieldPassword
              name="confirm_password"
              type="dual"
              value={form.values.confirm_password}
              isInvalid={form.touched.confirm_password && !!form.errors.confirm_password}
              autoComplete="new-password"
              onChange={eventHandlers.onChange}
              onBlur={eventHandlers.onBlur}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      ) : null}

      <EuiDescribedFormGroup
        title={
          <h2>
            <FormattedMessage
              id="xpack.security.management.users.userForm.privilegesTitle"
              defaultMessage="Privileges"
            />
          </h2>
        }
        description={i18n.translate(
          'xpack.security.management.users.userForm.privilegesDescription',
          {
            defaultMessage: 'Assign roles to manage access and permissions.',
          }
        )}
      >
        <EuiFormRow
          label={i18n.translate('xpack.security.management.users.userForm.rolesLabel', {
            defaultMessage: 'Roles',
          })}
          helpText={
            !isReservedUser && deprecatedRoles.length > 0 ? (
              <EuiTextColor color="warning">
                {deprecatedRoles.map((role) => (
                  <p key={role.name}>
                    <FormattedMessage
                      id="xpack.security.management.users.userForm.deprecatedRolesAssignedWarning"
                      defaultMessage="Role '{name}' is deprecated. {reason}."
                      values={{
                        name: role.name,
                        reason: role.metadata?._deprecated_reason?.replace(/\[(.+)\]/, "'$1'"),
                      }}
                    />
                  </p>
                ))}
              </EuiTextColor>
            ) : (
              <DocLink app="elasticsearch" doc="built-in-roles.html">
                <FormattedMessage
                  id="xpack.security.management.users.userForm.rolesHelpText"
                  defaultMessage="Learn what privileges individual roles grant."
                />
              </DocLink>
            )
          }
        >
          <RoleComboBox
            availableRoles={availableRoles}
            selectedRoleNames={selectedRoleNames}
            onChange={(value) => form.setValue('roles', value)}
            isLoading={rolesState.loading}
            isDisabled={isReservedUser}
          />
        </EuiFormRow>

        <EuiSpacer size="xxl" />
        {isReservedUser ? (
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton iconType="arrowLeft" onClick={onCancel}>
                <FormattedMessage
                  id="xpack.security.management.users.userForm.backToUsersButton"
                  defaultMessage="Back to users"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                type="submit"
                isLoading={form.isSubmitting}
                isDisabled={form.isSubmitted && form.isInvalid}
                fill
              >
                {isNewUser ? (
                  <FormattedMessage
                    id="xpack.security.management.users.userForm.createUserButton"
                    defaultMessage="{isSubmitting, select, true{Creating user…} other{Create user}}"
                    values={{ isSubmitting: form.isSubmitting }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.security.management.users.userForm.updateUserButton"
                    defaultMessage="{isSubmitting, select, true{Updating user…} other{Update user}}"
                    values={{ isSubmitting: form.isSubmitting }}
                  />
                )}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty flush="left" isDisabled={form.isSubmitting} onClick={onCancel}>
                <FormattedMessage
                  id="xpack.security.management.users.userForm.cancelButton"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiDescribedFormGroup>
    </EuiForm>
  );
};
