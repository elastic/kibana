/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormFieldset,
  EuiFormRow,
  EuiIcon,
  EuiLoadingContent,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { useEffect } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditorField, useKibana } from '@kbn/kibana-react-plugin/public';

import type { ApiKeyRoleDescriptors } from '../../../../common/model';
import { DocLink } from '../../../components/doc_link';
import type { FormFlyoutProps } from '../../../components/form_flyout';
import { FormFlyout } from '../../../components/form_flyout';
import { useCurrentUser } from '../../../components/use_current_user';
import { useForm } from '../../../components/use_form';
import type { ValidationErrors } from '../../../components/use_form';
import { useInitialFocus } from '../../../components/use_initial_focus';
import { RolesAPIClient } from '../../roles/roles_api_client';
import { APIKeysAPIClient } from '../api_keys_api_client';
import type { CreateApiKeyRequest, CreateApiKeyResponse } from '../api_keys_api_client';

export interface ApiKeyFormValues {
  name: string;
  expiration: string;
  customExpiration: boolean;
  customPrivileges: boolean;
  includeMetadata: boolean;
  role_descriptors: string;
  metadata: string;
}

export interface CreateApiKeyFlyoutProps {
  defaultValues?: ApiKeyFormValues;
  onSuccess?: (apiKey: CreateApiKeyResponse) => void;
  onCancel: FormFlyoutProps['onCancel'];
}

const defaultDefaultValues: ApiKeyFormValues = {
  name: '',
  expiration: '',
  customExpiration: false,
  customPrivileges: false,
  includeMetadata: false,
  role_descriptors: '{}',
  metadata: '{}',
};

export const CreateApiKeyFlyout: FunctionComponent<CreateApiKeyFlyoutProps> = ({
  onSuccess,
  onCancel,
  defaultValues = defaultDefaultValues,
}) => {
  const { services } = useKibana();
  const { value: currentUser, loading: isLoadingCurrentUser } = useCurrentUser();
  const [{ value: roles, loading: isLoadingRoles }, getRoles] = useAsyncFn(
    () => new RolesAPIClient(services.http!).getRoles(),
    [services.http]
  );
  const [form, eventHandlers] = useForm({
    onSubmit: async (values) => {
      try {
        const apiKey = await new APIKeysAPIClient(services.http!).createApiKey(mapValues(values));
        onSuccess?.(apiKey);
      } catch (error) {
        throw error;
      }
    },
    validate,
    defaultValues,
  });
  const isLoading = isLoadingCurrentUser || isLoadingRoles;

  useEffect(() => {
    getRoles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentUser && roles) {
      const userPermissions = currentUser.roles.reduce<ApiKeyRoleDescriptors>(
        (accumulator, roleName) => {
          const role = roles.find((r) => r.name === roleName);
          if (role) {
            accumulator[role.name] = role.elasticsearch;
          }
          return accumulator;
        },
        {}
      );
      if (!form.touched.role_descriptors) {
        form.setValue('role_descriptors', JSON.stringify(userPermissions, null, 2));
      }
    }
  }, [currentUser, roles]); // eslint-disable-line react-hooks/exhaustive-deps

  const firstFieldRef = useInitialFocus<HTMLInputElement>([isLoading]);

  return (
    <FormFlyout
      title={i18n.translate('xpack.security.accountManagement.createApiKey.title', {
        defaultMessage: 'Create API key',
      })}
      onCancel={onCancel}
      onSubmit={form.submit}
      submitButtonText={i18n.translate(
        'xpack.security.accountManagement.createApiKey.submitButton',
        {
          defaultMessage: '{isSubmitting, select, true{Creating API key…} other{Create API key}}',
          values: { isSubmitting: form.isSubmitting },
        }
      )}
      isLoading={form.isSubmitting}
      isDisabled={isLoading || (form.isSubmitted && form.isInvalid)}
      size="s"
      ownFocus
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

      {isLoading ? (
        <EuiLoadingContent />
      ) : (
        <EuiForm
          component="form"
          isInvalid={form.isInvalid}
          error={Object.values(form.errors)}
          invalidCallout={!form.submitError && form.isSubmitted ? 'above' : 'none'}
          {...eventHandlers}
        >
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
              <EuiFlexItem style={{ overflow: 'hidden' }}>
                <EuiSpacer size="xs" />
                <EuiText
                  style={{
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {currentUser?.username}
                </EuiText>
                <EuiSpacer size="xs" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.security.accountManagement.createApiKey.nameLabel', {
              defaultMessage: 'Name',
            })}
            helpText={i18n.translate('xpack.security.accountManagement.createApiKey.nameHelpText', {
              defaultMessage: 'What is this key used for?',
            })}
            error={form.errors.name}
            isInvalid={form.touched.name && !!form.errors.name}
          >
            <EuiFieldText
              name="name"
              defaultValue={form.values.name}
              isInvalid={form.touched.name && !!form.errors.name}
              inputRef={firstFieldRef}
              fullWidth
              data-test-subj="apiKeyNameInput"
            />
          </EuiFormRow>

          <EuiSpacer />
          <EuiFormFieldset>
            <EuiSwitch
              label={i18n.translate(
                'xpack.security.accountManagement.createApiKey.customPrivilegesLabel',
                {
                  defaultMessage: 'Restrict privileges',
                }
              )}
              checked={!!form.values.customPrivileges}
              onChange={(e) => form.setValue('customPrivileges', e.target.checked)}
            />
            {form.values.customPrivileges && (
              <>
                <EuiSpacer size="m" />
                <EuiFormRow
                  helpText={
                    <DocLink
                      app="elasticsearch"
                      doc="security-api-create-api-key.html#security-api-create-api-key-request-body"
                    >
                      <FormattedMessage
                        id="xpack.security.accountManagement.createApiKey.roleDescriptorsHelpText"
                        defaultMessage="Learn how to structure role descriptors."
                      />
                    </DocLink>
                  }
                  error={form.errors.role_descriptors}
                  isInvalid={form.touched.role_descriptors && !!form.errors.role_descriptors}
                >
                  <CodeEditorField
                    value={form.values.role_descriptors!}
                    onChange={(value) => form.setValue('role_descriptors', value)}
                    languageId="xjson"
                    height={200}
                  />
                </EuiFormRow>
                <EuiSpacer size="s" />
              </>
            )}
          </EuiFormFieldset>

          <EuiSpacer />
          <EuiFormFieldset>
            <EuiSwitch
              label={i18n.translate(
                'xpack.security.accountManagement.createApiKey.customExpirationLabel',
                {
                  defaultMessage: 'Expire after time',
                }
              )}
              checked={!!form.values.customExpiration}
              onChange={(e) => form.setValue('customExpiration', e.target.checked)}
              data-test-subj="apiKeyCustomExpirationSwitch"
            />
            {form.values.customExpiration && (
              <>
                <EuiSpacer size="m" />
                <EuiFormRow
                  error={form.errors.expiration}
                  isInvalid={form.touched.expiration && !!form.errors.expiration}
                  label={i18n.translate(
                    'xpack.security.accountManagement.createApiKey.customExpirationInputLabel',
                    {
                      defaultMessage: 'Lifetime (days)',
                    }
                  )}
                >
                  <EuiFieldNumber
                    append={i18n.translate(
                      'xpack.security.accountManagement.createApiKey.expirationUnit',
                      {
                        defaultMessage: 'days',
                      }
                    )}
                    name="expiration"
                    min={0}
                    defaultValue={form.values.expiration}
                    isInvalid={form.touched.expiration && !!form.errors.expiration}
                    fullWidth
                    data-test-subj="apiKeyCustomExpirationInput"
                  />
                </EuiFormRow>
                <EuiSpacer size="s" />
              </>
            )}
          </EuiFormFieldset>

          <EuiSpacer />
          <EuiFormFieldset>
            <EuiSwitch
              label={i18n.translate(
                'xpack.security.accountManagement.createApiKey.includeMetadataLabel',
                {
                  defaultMessage: 'Include metadata',
                }
              )}
              checked={!!form.values.includeMetadata}
              onChange={(e) => form.setValue('includeMetadata', e.target.checked)}
            />
            {form.values.includeMetadata && (
              <>
                <EuiSpacer size="m" />
                <EuiFormRow
                  helpText={
                    <DocLink
                      app="elasticsearch"
                      doc="security-api-create-api-key.html#security-api-create-api-key-request-body"
                    >
                      <FormattedMessage
                        id="xpack.security.accountManagement.createApiKey.metadataHelpText"
                        defaultMessage="Learn how to structure metadata."
                      />
                    </DocLink>
                  }
                  error={form.errors.metadata}
                  isInvalid={form.touched.metadata && !!form.errors.metadata}
                >
                  <CodeEditorField
                    value={form.values.metadata!}
                    onChange={(value) => form.setValue('metadata', value)}
                    languageId="xjson"
                    height={200}
                  />
                </EuiFormRow>
                <EuiSpacer size="s" />
              </>
            )}
          </EuiFormFieldset>

          {/* Hidden submit button is required for enter key to trigger form submission */}
          <input type="submit" hidden />
        </EuiForm>
      )}
    </FormFlyout>
  );
};

export function validate(values: ApiKeyFormValues) {
  const errors: ValidationErrors<ApiKeyFormValues> = {};

  if (!values.name) {
    errors.name = i18n.translate('xpack.security.management.apiKeys.createApiKey.nameRequired', {
      defaultMessage: 'Enter a name.',
    });
  }

  if (values.customExpiration) {
    const parsedExpiration = parseFloat(values.expiration);
    if (isNaN(parsedExpiration) || parsedExpiration <= 0) {
      errors.expiration = i18n.translate(
        'xpack.security.management.apiKeys.createApiKey.expirationRequired',
        {
          defaultMessage: 'Enter a valid duration or disable this option.',
        }
      );
    }
  }

  if (values.customPrivileges) {
    if (!values.role_descriptors) {
      errors.role_descriptors = i18n.translate(
        'xpack.security.management.apiKeys.createApiKey.roleDescriptorsRequired',
        {
          defaultMessage: 'Enter role descriptors or disable this option.',
        }
      );
    } else {
      try {
        JSON.parse(values.role_descriptors);
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

  if (values.includeMetadata) {
    if (!values.metadata) {
      errors.metadata = i18n.translate(
        'xpack.security.management.apiKeys.createApiKey.metadataRequired',
        {
          defaultMessage: 'Enter metadata or disable this option.',
        }
      );
    } else {
      try {
        JSON.parse(values.metadata);
      } catch (e) {
        errors.metadata = i18n.translate(
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

export function mapValues(values: ApiKeyFormValues): CreateApiKeyRequest {
  return {
    name: values.name,
    expiration: values.customExpiration && values.expiration ? `${values.expiration}d` : undefined,
    role_descriptors:
      values.customPrivileges && values.role_descriptors
        ? JSON.parse(values.role_descriptors)
        : undefined,
    metadata: values.includeMetadata && values.metadata ? JSON.parse(values.metadata) : undefined,
  };
}
