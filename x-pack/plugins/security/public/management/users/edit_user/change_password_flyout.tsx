/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFieldPassword,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiLoadingContent,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { FormFlyout } from '../../../components/form_flyout';
import { useCurrentUser } from '../../../components/use_current_user';
import type { ValidationErrors } from '../../../components/use_form';
import { useForm } from '../../../components/use_form';
import { useInitialFocus } from '../../../components/use_initial_focus';
import { UserAPIClient } from '../user_api_client';

export interface ChangePasswordFormValues {
  current_password?: string;
  password: string;
  confirm_password: string;
}

export interface ChangePasswordFlyoutProps {
  username: string;
  defaultValues?: ChangePasswordFormValues;
  onCancel(): void;
  onSuccess?(): void;
}

export const validateChangePasswordForm = (
  values: ChangePasswordFormValues,
  isCurrentUser: boolean
) => {
  const errors: ValidationErrors<typeof values> = {};

  if (isCurrentUser) {
    if (!values.current_password) {
      errors.current_password = i18n.translate(
        'xpack.security.management.users.changePasswordFlyout.currentPasswordRequiredError',
        {
          defaultMessage: 'Enter your current password.',
        }
      );
    }
  }

  if (!values.password) {
    errors.password = i18n.translate(
      'xpack.security.management.users.changePasswordFlyout.passwordRequiredError',
      {
        defaultMessage: 'Enter a new password.',
      }
    );
  } else if (values.password.length < 6) {
    errors.password = i18n.translate(
      'xpack.security.management.users.changePasswordFlyout.passwordInvalidError',
      {
        defaultMessage: 'Password must be at least 6 characters.',
      }
    );
  } else if (values.password !== values.confirm_password) {
    errors.confirm_password = i18n.translate(
      'xpack.security.management.users.changePasswordFlyout.confirmPasswordInvalidError',
      {
        defaultMessage: 'Passwords do not match.',
      }
    );
  }

  return errors;
};

export const ChangePasswordFlyout: FunctionComponent<ChangePasswordFlyoutProps> = ({
  username,
  defaultValues = {
    current_password: '',
    password: '',
    confirm_password: '',
  },
  onSuccess,
  onCancel,
}) => {
  const { services } = useKibana();
  const { value: currentUser, loading: isLoading } = useCurrentUser();
  const isCurrentUser = currentUser?.username === username;
  const isSystemUser = username === 'kibana' || username === 'kibana_system';

  const [form, eventHandlers] = useForm({
    onSubmit: async (values) => {
      try {
        await new UserAPIClient(services.http!).changePassword(
          username,
          values.password,
          values.current_password
        );
        services.notifications!.toasts.addSuccess(
          i18n.translate('xpack.security.management.users.changePasswordFlyout.successMessage', {
            defaultMessage: "Password changed for '{username}'.",
            values: { username },
          })
        );
        onSuccess?.();
      } catch (error) {
        if ((error as any).body?.message === 'security_exception') {
          form.setError(
            'current_password',
            i18n.translate(
              'xpack.security.management.users.changePasswordFlyout.currentPasswordInvalidError',
              {
                defaultMessage: 'Invalid password.',
              }
            )
          );
        } else {
          services.notifications!.toasts.addDanger({
            title: i18n.translate(
              'xpack.security.management.users.changePasswordFlyout.errorMessage',
              {
                defaultMessage: 'Could not change password',
              }
            ),
            text: (error as any).body?.message || error.message,
          });
          throw error;
        }
      }
    },
    validate: async (values) => validateChangePasswordForm(values, isCurrentUser),
    defaultValues,
  });

  const firstFieldRef = useInitialFocus<HTMLInputElement>([isLoading]);

  return (
    <FormFlyout
      title={i18n.translate('xpack.security.management.users.changePasswordFlyout.title', {
        defaultMessage: 'Change password',
      })}
      onCancel={onCancel}
      onSubmit={form.submit}
      submitButtonText={
        isSystemUser
          ? i18n.translate(
              'xpack.security.management.users.changePasswordFlyout.confirmSystemPasswordButton',
              {
                defaultMessage:
                  '{isSubmitting, select, true{Changing password…} other{Change password}}',
                values: { isSubmitting: form.isSubmitting },
              }
            )
          : i18n.translate('xpack.security.management.users.changePasswordFlyout.confirmButton', {
              defaultMessage:
                '{isSubmitting, select, true{Changing password…} other{Change password}}',
              values: { isSubmitting: form.isSubmitting },
            })
      }
      submitButtonColor={isSystemUser ? 'danger' : undefined}
      isLoading={form.isSubmitting}
      isDisabled={isLoading || (form.isSubmitted && form.isInvalid)}
      size="s"
      ownFocus
    >
      {isLoading ? (
        <EuiLoadingContent />
      ) : (
        <EuiForm component="form" noValidate {...eventHandlers}>
          {isSystemUser ? (
            <>
              <EuiCallOut
                title={i18n.translate(
                  'xpack.security.management.users.changePasswordFlyout.systemUserTitle',
                  { defaultMessage: 'This is extremely important!' }
                )}
                color="danger"
                iconType="alert"
              >
                <p>
                  <FormattedMessage
                    id="xpack.security.management.users.changePasswordFlyout.systemUserWarning"
                    defaultMessage="Changing this password will prevent Kibana from communicating with Elasticsearch."
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.security.management.users.changePasswordFlyout.systemUserDescription"
                    defaultMessage="Once changed, you must manually update your config file with the new password and restart Kibana."
                  />
                </p>
              </EuiCallOut>
              <EuiSpacer />
            </>
          ) : undefined}

          <EuiFormRow
            label={i18n.translate(
              'xpack.security.management.users.changePasswordFlyout.userLabel',
              {
                defaultMessage: 'User',
              }
            )}
          >
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="user" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSpacer size="xs" />
                <EuiText>{username}</EuiText>
                <EuiSpacer size="xs" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>

          {isCurrentUser ? (
            <EuiFormRow
              label={i18n.translate(
                'xpack.security.management.users.changePasswordFlyout.currentPasswordLabel',
                { defaultMessage: 'Current password' }
              )}
              error={form.errors.current_password}
              isInvalid={form.touched.current_password && !!form.errors.current_password}
            >
              <EuiFieldPassword
                name="current_password"
                type="dual"
                defaultValue={form.values.current_password}
                isInvalid={form.touched.current_password && !!form.errors.current_password}
                autoComplete="current-password"
                inputRef={firstFieldRef}
                data-test-subj="editUserChangePasswordCurrentPasswordInput"
              />
            </EuiFormRow>
          ) : null}

          <EuiFormRow
            label={i18n.translate(
              'xpack.security.management.users.changePasswordFlyout.passwordLabel',
              {
                defaultMessage: 'New password',
              }
            )}
            helpText="Password must be at least 6 characters."
            error={form.errors.password}
            isInvalid={form.touched.password && !!form.errors.password}
          >
            <EuiFieldPassword
              name="password"
              type="dual"
              defaultValue={form.values.password}
              isInvalid={form.touched.password && !!form.errors.password}
              autoComplete="new-password"
              inputRef={isCurrentUser ? undefined : firstFieldRef}
              data-test-subj="editUserChangePasswordNewPasswordInput"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate(
              'xpack.security.management.users.changePasswordFlyout.confirmPasswordLabel',
              { defaultMessage: 'Confirm password' }
            )}
            error={form.errors.confirm_password}
            isInvalid={form.touched.confirm_password && !!form.errors.confirm_password}
          >
            <EuiFieldPassword
              name="confirm_password"
              type="dual"
              defaultValue={form.values.confirm_password}
              isInvalid={form.touched.confirm_password && !!form.errors.confirm_password}
              autoComplete="new-password"
              data-test-subj="editUserChangePasswordConfirmPasswordInput"
            />
          </EuiFormRow>

          {/* Hidden submit button is required for enter key to trigger form submission */}
          <input type="submit" hidden />
        </EuiForm>
      )}
    </FormFlyout>
  );
};
