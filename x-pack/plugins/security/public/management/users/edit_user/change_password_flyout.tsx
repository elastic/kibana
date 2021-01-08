/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiFieldPassword,
  EuiForm,
  EuiFormRow,
  EuiLoadingContent,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { useForm, ValidationErrors } from '../../../components/use_form';
import { useCurrentUser } from '../../../components/use_current_user';
import { FormFlyout } from '../../../components/form_flyout';
import { UserAPIClient } from '..';

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
            defaultMessage: "Changed password for user '{username}'",
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
                defaultMessage: 'Invalid password. Please try again.',
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
    validate: async (values) => {
      const errors: ValidationErrors<typeof values> = {};

      if (isCurrentUser) {
        if (!values.current_password) {
          errors.current_password = i18n.translate(
            'xpack.security.management.users.changePasswordFlyout.currentPasswordRequiredError',
            {
              defaultMessage: 'Please enter your current password.',
            }
          );
        }
      }

      if (!values.password) {
        errors.password = i18n.translate(
          'xpack.security.management.users.changePasswordFlyout.passwordRequiredError',
          {
            defaultMessage: 'Please enter a new password.',
          }
        );
      } else if (values.password.length < 6) {
        errors.password = i18n.translate(
          'xpack.security.management.users.changePasswordFlyout.passwordInvalidError',
          {
            defaultMessage: 'Password must be at least 6 characters.',
          }
        );
      } else if (!values.confirm_password) {
        errors.confirm_password = i18n.translate(
          'xpack.security.management.users.changePasswordFlyout.confirmPasswordRequiredError',
          {
            defaultMessage: 'Please confirm your new password.',
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
    },
    defaultValues,
  });

  return (
    <FormFlyout
      title={i18n.translate('xpack.security.management.users.changePasswordFlyout.title', {
        defaultMessage: 'Change password',
      })}
      onCancel={onCancel}
      onSubmit={form.submit}
      submitButtonText={i18n.translate(
        'xpack.security.management.users.changePasswordFlyout.confirmButton',
        {
          defaultMessage: '{isSubmitting, select, true{Changing password…} other{Change password}}',
          values: { isSubmitting: form.isSubmitting },
        }
      )}
      isLoading={form.isSubmitting}
      isDisabled={isLoading || (form.isSubmitted && form.isInvalid)}
      size="s"
      ownFocus
    >
      {isLoading ? (
        <EuiLoadingContent />
      ) : (
        <EuiForm component="form" {...eventHandlers}>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.security.management.users.changePasswordFlyout.description"
                defaultMessage="Once changed, the user will no longer be able to log in using their previous password."
              />
            </p>
          </EuiText>
          <EuiSpacer />

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
                autoComplete="password"
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
            />
          </EuiFormRow>
          {/* Hidden submit button is required for enter key to trigger form submission */}
          <input type="submit" hidden />
        </EuiForm>
      )}
    </FormFlyout>
  );
};
