/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, FunctionComponent } from 'react';
import {
  EuiCallOut,
  EuiFieldNumber,
  EuiFieldText,
  EuiForm,
  EuiPanel,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana, CodeEditor } from '../../../../../../src/plugins/kibana_react/public';
import {
  APIKeysAPIClient,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
} from '../../management/api_keys/api_keys_api_client';
import { useForm, ValidationErrors } from '../components/use_form';
import { FormFlyout, FormFlyoutProps } from '../components/form_flyout';
import { DocLink } from '../components/doc_link';

export interface FormValues {
  name: string;
  expiration: string;
  customExpiration: boolean;
  customPrivileges: boolean;
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
      size="s"
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
          helpText={i18n.translate('xpack.security.accountManagement.createApiKey.nameHelpText', {
            defaultMessage: 'What is the API key used for?',
          })}
          error={form.errors.name}
          isInvalid={!!form.errors.name}
        >
          <EuiFieldText
            name="name"
            defaultValue={form.values.name}
            isInvalid={!!form.errors.name}
            inputRef={nameInput}
            fullWidth
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
          checked={!!form.values.customPrivileges}
          onChange={(e) => form.setValue('customPrivileges', e.target.checked)}
        />
        {form.values.customPrivileges && (
          <>
            <EuiSpacer />
            <EuiFormRow
              label={i18n.translate(
                'xpack.security.accountManagement.createApiKey.roleDescriptorsLabel',
                {
                  defaultMessage: 'Role Descriptors',
                }
              )}
              helpText={
                <DocLink
                  app="elasticsearch"
                  doc="security-api-create-api-key.html#security-api-create-api-key-request-body"
                >
                  <FormattedMessage
                    id="xpack.security.accountManagement.createApiKey.roleDescriptorsHelpText"
                    defaultMessage="Learn about role descriptors."
                  />
                </DocLink>
              }
              error={form.errors.role_descriptors}
              isInvalid={!!form.errors.role_descriptors}
            >
              <EuiPanel paddingSize="s" style={{ boxShadow: 'none' }}>
                <CodeEditor
                  value={form.values.role_descriptors!}
                  onChange={(value) => form.setValue('role_descriptors', value)}
                  width="100%"
                  height="300px"
                  languageId="xjson"
                  options={{
                    fixedOverflowWidgets: true,
                    folding: false,
                    lineNumbers: 'off',
                    scrollBeyondLastLine: false,
                    minimap: {
                      enabled: false,
                    },
                    scrollbar: {
                      useShadows: false,
                    },
                    wordBasedSuggestions: false,
                    wordWrap: 'on',
                    wrappingIndent: 'indent',
                  }}
                />
              </EuiPanel>
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
                'xpack.security.accountManagement.createApiKey.expirationLabel',
                {
                  defaultMessage: 'Duration',
                }
              )}
              error={form.errors.expiration}
              isInvalid={!!form.errors.expiration}
            >
              <EuiFieldNumber
                append={i18n.translate(
                  'xpack.security.accountManagement.createApiKey.expirationUnit',
                  {
                    defaultMessage: 'days',
                  }
                )}
                name="expiration"
                defaultValue={form.values.expiration}
                isInvalid={!!form.errors.expiration}
                fullWidth
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
    customPrivileges: false,
    role_descriptors: JSON.stringify(
      {
        'role-a': {
          cluster: ['all'],
          indices: [
            {
              names: ['index-a*'],
              privileges: ['read'],
            },
          ],
        },
        'role-b': {
          cluster: ['all'],
          indices: [
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
    errors.name = i18n.translate('xpack.security.management.apiKeys.createApiKey.nameRequired', {
      defaultMessage: 'Enter a name.',
    });
  }

  if (v.customExpiration && !v.expiration) {
    errors.expiration = i18n.translate(
      'xpack.security.management.apiKeys.createApiKey.expirationRequired',
      {
        defaultMessage: 'Enter a duration or disable the option.',
      }
    );
  }

  if (v.customPrivileges) {
    if (!v.role_descriptors) {
      errors.role_descriptors = i18n.translate(
        'xpack.security.management.apiKeys.createApiKey.roleDescriptorsRequired',
        {
          defaultMessage: 'Enter role descriptors or disable the option.',
        }
      );
    } else {
      try {
        JSON.parse(v.role_descriptors);
      } catch (e) {
        errors.role_descriptors = i18n.translate(
          'xpack.security.management.apiKeys.createApiKey.invalidJsonError',
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
      values.customPrivileges && values.role_descriptors
        ? JSON.parse(values.role_descriptors)
        : undefined,
  };
}
