/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, FunctionComponent } from 'react';
import {
  EuiCallOut,
  EuiCodeEditor,
  EuiFieldNumber,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  APIKeysAPIClient,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
} from '../../management/api_keys/api_keys_api_client';
import { useForm, ValidationErrors } from '../components/use_form';
import { FormFlyout, FormFlyoutProps } from '../components/form_flyout';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

export interface FormValues {
  name: string;
  expiration: string;
  customExpiration: boolean;
  customPriviliges: boolean;
  role_descriptors: string;
}

export interface CreateApiKeyFlyoutProps {
  defaultValues?: Partial<FormValues>;
  onSuccess?: (apiKey: CreateApiKeyResponse) => void;
  onError?: (error: Error) => void;
  onClose: FormFlyoutProps['onClose'];
}

export const CreateApiKeyFlyout: FunctionComponent<CreateApiKeyFlyoutProps> = ({
  onSuccess,
  onError,
  onClose,
  defaultValues,
}) => {
  const { services } = useKibana();
  const [form, eventHandlers] = useForm<FormValues, CreateApiKeyResponse>(
    {
      onSubmit: (values) => new APIKeysAPIClient(services.http!).createApiKey(mapValues(values)),
      onSubmitSuccess: onSuccess,
      onSubmitError: onError,
      validate,
      defaultValues,
    },
    [services.http]
  );
  const nameInput = useRef<HTMLInputElement>(null);

  return (
    <FormFlyout
      title={i18n.translate('xpack.security.accountManagement.createApiKey.title', {
        defaultMessage: 'Create API key',
      })}
      submitButtonText={i18n.translate(
        'xpack.security.accountManagement.createApiKey.submitButton',
        {
          defaultMessage: '{isSubmitting, select, true{Creating API key…} other{Create API key}}',
          values: { isSubmitting: form.isSubmitting },
        }
      )}
      isLoading={form.isSubmitting}
      initialFocus={nameInput}
      onSubmit={eventHandlers.onSubmit}
      onClose={onClose}
    >
      {form.submitError && (
        <>
          <EuiCallOut
            title={i18n.translate('xpack.security.accountManagement.createApiKey.errorMessage', {
              defaultMessage: 'Could not create API key',
            })}
            color="danger"
          >
            {(form.submitError as any).body?.message || form.submitError.message}
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <EuiForm
        component="form"
        isInvalid={form.isInvalid}
        error={Object.values(form.errors)}
        invalidCallout={!form.submitError && form.isSubmitted ? 'above' : 'none'}
        {...eventHandlers}
      >
        <EuiFormRow
          label={i18n.translate('xpack.security.accountManagement.createApiKey.nameLabel', {
            defaultMessage: 'Name',
          })}
          helpText="What is the API key used for?"
          error={form.errors.name}
          isInvalid={!!form.errors.name}
        >
          <EuiFieldText
            name="name"
            defaultValue={form.values.name}
            isInvalid={!!form.errors.name}
            inputRef={nameInput}
          />
        </EuiFormRow>

        <EuiSpacer />
        <EuiSwitch
          id="apiKeyCustom"
          label={i18n.translate(
            'xpack.security.accountManagement.createApiKey.customPriviligesLabel',
            {
              defaultMessage: 'Grant subset of your permissions',
            }
          )}
          checked={!!form.values.customPriviliges}
          onChange={(e) => form.setValue('customPriviliges', e.target.checked)}
        />
        {form.values.customPriviliges && (
          <>
            <EuiSpacer />
            <EuiFormRow
              label={i18n.translate(
                'xpack.security.accountManagement.createApiKey.roleDescriptorsLabel',
                {
                  defaultMessage: 'Role Descriptors',
                }
              )}
              helpText="https://www.elastic.co/guide/en/elasticsearch/reference/current/security-api-create-api-key.html#security-api-create-api-key-request-body"
              error={form.errors.role_descriptors}
              isInvalid={!!form.errors.role_descriptors}
            >
              <EuiCodeEditor
                onChange={(value) => form.setValue('role_descriptors', value)}
                onBlur={() => form.trigger('role_descriptors')}
                value={form.values.role_descriptors}
                height="300px"
                mode="json"
              />
            </EuiFormRow>
          </>
        )}

        <EuiSpacer />
        <EuiSwitch
          id="apiKeyCeverExpire"
          name="customExpiration"
          label={i18n.translate(
            'xpack.security.accountManagement.createApiKey.customExpirationLabel',
            {
              defaultMessage: 'Expire after time',
            }
          )}
          checked={!!form.values.customExpiration}
          onChange={(e) => form.setValue('customExpiration', e.target.checked)}
        />
        {form.values.customExpiration && (
          <>
            <EuiSpacer />
            <EuiFormRow
              label={i18n.translate(
                'xpack.security.accountManagement.createApiKey.roleDescriptorsLabel',
                {
                  defaultMessage: 'Duration',
                }
              )}
              error={form.errors.expiration}
              isInvalid={!!form.errors.expiration}
            >
              <EuiFieldNumber
                append="days"
                name="expiration"
                defaultValue={form.values.expiration}
                isInvalid={!!form.errors.expiration}
              />
            </EuiFormRow>
          </>
        )}
      </EuiForm>
    </FormFlyout>
  );
};

CreateApiKeyFlyout.defaultProps = {
  defaultValues: {
    customExpiration: false,
    customPriviliges: false,
    role_descriptors: JSON.stringify(
      {
        'role-a': {
          cluster: ['all'],
          index: [
            {
              names: ['index-a*'],
              privileges: ['read'],
            },
          ],
        },
        'role-b': {
          cluster: ['all'],
          index: [
            {
              names: ['index-b*'],
              privileges: ['all'],
            },
          ],
        },
      },
      null,
      2
    ),
  },
};

export function validate(v: Partial<FormValues>) {
  const errors: ValidationErrors<FormValues> = {};

  if (!v.name) {
    errors.name = 'Enter a name.';
  }

  if (v.customExpiration && !v.expiration) {
    errors.expiration = i18n.translate(
      'xpack.security.management.apiKeys.createApiKey.successNotification',
      {
        defaultMessage: 'Enter a duration or disable the option.',
      }
    );
  }

  if (v.customPriviliges) {
    if (!v.role_descriptors) {
      errors.role_descriptors = i18n.translate(
        'xpack.security.management.apiKeys.createApiKey.successNotification',
        {
          defaultMessage: 'Enter role descriptors or disable the option.',
        }
      );
    } else {
      try {
        JSON.parse(v.role_descriptors);
      } catch (e) {
        errors.role_descriptors = i18n.translate(
          'xpack.security.management.apiKeys.createApiKey.successNotification',
          {
            defaultMessage: 'Enter valid JSON.',
          }
        );
      }
    }
  }

  return errors;
}

export function mapValues(values: FormValues): CreateApiKeyRequest {
  return {
    name: values.name,
    expiration: values.customExpiration && values.expiration ? `${values.expiration}d` : undefined,
    role_descriptors:
      values.customPriviliges && values.role_descriptors
        ? JSON.parse(values.role_descriptors)
        : undefined,
  };
}
