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
import moment from 'moment-timezone';
import type { FunctionComponent } from 'react';
import React, { useEffect } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditorField, useKibana } from '@kbn/kibana-react-plugin/public';

import type { ApiKey, ApiKeyRoleDescriptors } from '../../../../common/model';
import { DocLink } from '../../../components/doc_link';
import type { FormFlyoutProps } from '../../../components/form_flyout';
import { FormFlyout } from '../../../components/form_flyout';
import { useCurrentUser } from '../../../components/use_current_user';
import { useForm } from '../../../components/use_form';
import type { ValidationErrors } from '../../../components/use_form';
import { useInitialFocus } from '../../../components/use_initial_focus';
import { RolesAPIClient } from '../../roles/roles_api_client';
import { APIKeysAPIClient } from '../api_keys_api_client';
import type {
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateApiKeyRequest,
  UpdateApiKeyResponse,
} from '../api_keys_api_client';

export interface ApiKeyFormValues {
  name: string;
  expiration: string;
  customExpiration: boolean;
  customPrivileges: boolean;
  includeMetadata: boolean;
  role_descriptors: string;
  metadata: string;
}

export interface ApiKeyFlyoutProps {
  defaultValues?: ApiKeyFormValues;
  onSuccess?: (
    createdApiKeyResponse: CreateApiKeyResponse | undefined,
    updateApiKeyResponse: UpdateApiKeyResponse | undefined
  ) => void;
  onCancel: FormFlyoutProps['onCancel'];
  selectedApiKey?: ApiKey;
  readonly?: boolean;
}

const defaultDefaultValues: ApiKeyFormValues = {
  name: '',
  customExpiration: false,
  expiration: '',
  includeMetadata: false,
  metadata: '{}',
  customPrivileges: false,
  role_descriptors: '{}',
};

export const ApiKeyFlyout: FunctionComponent<ApiKeyFlyoutProps> = ({
  onSuccess,
  onCancel,
  defaultValues = defaultDefaultValues,
  selectedApiKey,
  readonly = false,
}) => {
  let formTitle = 'Create API Key';
  let inProgressButtonText = 'Creating API Key…';

  if (selectedApiKey) {
    // Collect data from the selected API key to pre-populate the form
    const doesMetadataExist = Object.keys(selectedApiKey.metadata).length > 0;
    const doCustomPrivilegesExist = Object.keys(selectedApiKey.role_descriptors ?? 0).length > 0;
    const daysUntilExpiration = moment(selectedApiKey.expiration).diff(moment(), 'days', true);
    const roundedDaysUntilExpiration =
      Math.round((daysUntilExpiration + Number.EPSILON) * 100) / 100;

    defaultValues = {
      name: selectedApiKey.name,
      customExpiration: !!selectedApiKey.expiration,
      expiration: roundedDaysUntilExpiration.toString(),
      includeMetadata: doesMetadataExist,
      metadata: doesMetadataExist ? JSON.stringify(selectedApiKey.metadata, null, 2) : '{}',
      customPrivileges: doCustomPrivilegesExist,
      role_descriptors: doCustomPrivilegesExist
        ? JSON.stringify(selectedApiKey.role_descriptors, null, 2)
        : '{}',
    };

    if (readonly) {
      formTitle = 'View API Key';
      inProgressButtonText = ''; // This won't be seen since Submit will be disabled
    } else {
      formTitle = 'Update API Key';
      inProgressButtonText = 'Updating API Key…';
    }
  }

  const { services } = useKibana();

  const { value: currentUser, loading: isLoadingCurrentUser } = useCurrentUser();

  const [{ value: roles, loading: isLoadingRoles }, getRoles] = useAsyncFn(
    () => new RolesAPIClient(services.http!).getRoles(),
    [services.http]
  );

  const [form, eventHandlers] = useForm({
    onSubmit: async (values) => {
      try {
        if (selectedApiKey) {
          const updateApiKeyResponse = await new APIKeysAPIClient(services.http!).updateApiKey(
            mapUpdateApiKeyValues(selectedApiKey.id, values)
          );

          onSuccess?.(undefined, updateApiKeyResponse);
        } else {
          const createApiKeyResponse = await new APIKeysAPIClient(services.http!).createApiKey(
            mapCreateApiKeyValues(values)
          );

          onSuccess?.(createApiKeyResponse, undefined);
        }
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

      if (!form.touched.role_descriptors && !selectedApiKey) {
        form.setValue('role_descriptors', JSON.stringify(userPermissions, null, 2));
      }
    }
  }, [currentUser, roles]); // eslint-disable-line react-hooks/exhaustive-deps

  const firstFieldRef = useInitialFocus<HTMLInputElement>([isLoading]);

  return (
    <FormFlyout
      title={i18n.translate('xpack.security.accountManagement.apiKeyFlyout.title', {
        defaultMessage: `{formTitle}`,
        values: { formTitle },
      })}
      onCancel={onCancel}
      onSubmit={form.submit}
      submitButtonText={i18n.translate(
        'xpack.security.accountManagement.apiKeyFlyout.submitButton',
        {
          defaultMessage: `{isSubmitting, select, true{{inProgressButtonText}} other{{formTitle}}}`,
          values: { isSubmitting: form.isSubmitting, inProgressButtonText, formTitle },
        }
      )}
      isLoading={form.isSubmitting}
      isDisabled={isLoading || (form.isSubmitted && form.isInvalid) || readonly}
      size="s"
      ownFocus
    >
      {form.submitError && (
        <>
          <EuiCallOut
            title={i18n.translate('xpack.security.accountManagement.apiKeyFlyout.errorMessage', {
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
            label={i18n.translate('xpack.security.accountManagement.apiKeyFlyout.nameLabel', {
              defaultMessage: 'Name',
            })}
            helpText={i18n.translate('xpack.security.accountManagement.apiKeyFlyout.nameHelpText', {
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
              disabled={!!selectedApiKey || readonly}
              fullWidth
              data-test-subj="apiKeyNameInput"
            />
          </EuiFormRow>

          <EuiSpacer />
          <EuiFormFieldset>
            <EuiSwitch
              label={i18n.translate(
                'xpack.security.accountManagement.apiKeyFlyout.customPrivilegesLabel',
                {
                  defaultMessage: 'Restrict privileges',
                }
              )}
              checked={!!form.values.customPrivileges}
              data-test-subj="apiKeysRoleDescriptorsSwitch"
              onChange={(e) => form.setValue('customPrivileges', e.target.checked)}
              disabled={readonly}
            />
            {form.values.customPrivileges && (
              <>
                <EuiSpacer size="m" />
                <EuiFormRow
                  data-test-subj="apiKeysRoleDescriptorsCodeEditor"
                  helpText={
                    <DocLink
                      app="elasticsearch"
                      doc="security-api-create-api-key.html#security-api-create-api-key-request-body"
                    >
                      <FormattedMessage
                        id="xpack.security.accountManagement.apiKeyFlyout.roleDescriptorsHelpText"
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
                    options={{ readOnly: readonly }}
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
                'xpack.security.accountManagement.apiKeyFlyout.customExpirationLabel',
                {
                  defaultMessage: 'Expire after time',
                }
              )}
              checked={!!form.values.customExpiration}
              onChange={(e) => form.setValue('customExpiration', e.target.checked)}
              disabled={!!selectedApiKey || readonly}
              data-test-subj="apiKeyCustomExpirationSwitch"
            />
            {form.values.customExpiration && (
              <>
                <EuiSpacer size="m" />
                <EuiFormRow
                  error={form.errors.expiration}
                  isInvalid={form.touched.expiration && !!form.errors.expiration && !selectedApiKey}
                  label={i18n.translate(
                    'xpack.security.accountManagement.apiKeyFlyout.customExpirationInputLabel',
                    {
                      defaultMessage: 'Lifetime (days)',
                    }
                  )}
                >
                  <EuiFieldNumber
                    append={i18n.translate(
                      'xpack.security.accountManagement.apiKeyFlyout.expirationUnit',
                      {
                        defaultMessage: 'days',
                      }
                    )}
                    name="expiration"
                    min={0}
                    defaultValue={form.values.expiration}
                    isInvalid={
                      form.touched.expiration && !!form.errors.expiration && !selectedApiKey
                    }
                    fullWidth
                    data-test-subj="apiKeyCustomExpirationInput"
                    disabled={!!selectedApiKey || readonly}
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
                'xpack.security.accountManagement.apiKeyFlyout.includeMetadataLabel',
                {
                  defaultMessage: 'Include metadata',
                }
              )}
              data-test-subj="apiKeysMetadataSwitch"
              checked={!!form.values.includeMetadata}
              disabled={readonly}
              onChange={(e) => form.setValue('includeMetadata', e.target.checked)}
            />
            {form.values.includeMetadata && (
              <>
                <EuiSpacer size="m" />
                <EuiFormRow
                  data-test-subj="apiKeysMetadataCodeEditor"
                  helpText={
                    <DocLink
                      app="elasticsearch"
                      doc="security-api-create-api-key.html#security-api-create-api-key-request-body"
                    >
                      <FormattedMessage
                        id="xpack.security.accountManagement.apiKeyFlyout.metadataHelpText"
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
                    options={{ readOnly: readonly }}
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

export function validate(values: ApiKeyFormValues, isEdit: boolean = false) {
  const errors: ValidationErrors<ApiKeyFormValues> = {};

  if (!values.name) {
    errors.name = i18n.translate('xpack.security.management.apiKeys.apiKeyFlyout.nameRequired', {
      defaultMessage: 'Enter a name.',
    });
  }

  if (values.customExpiration && !isEdit) {
    const parsedExpiration = parseFloat(values.expiration);
    if (isNaN(parsedExpiration) || parsedExpiration <= 0) {
      errors.expiration = i18n.translate(
        'xpack.security.management.apiKeys.apiKeyFlyout.expirationRequired',
        {
          defaultMessage: 'Enter a valid duration or disable this option.',
        }
      );
    }
  }

  if (values.customPrivileges) {
    if (!values.role_descriptors) {
      errors.role_descriptors = i18n.translate(
        'xpack.security.management.apiKeys.apiKeyFlyout.roleDescriptorsRequired',
        {
          defaultMessage: 'Enter role descriptors or disable this option.',
        }
      );
    } else {
      try {
        JSON.parse(values.role_descriptors);
      } catch (e) {
        errors.role_descriptors = i18n.translate(
          'xpack.security.management.apiKeys.apiKeyFlyout.invalidJsonError',
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
        'xpack.security.management.apiKeys.apiKeyFlyout.metadataRequired',
        {
          defaultMessage: 'Enter metadata or disable this option.',
        }
      );
    } else {
      try {
        JSON.parse(values.metadata);
      } catch (e) {
        errors.metadata = i18n.translate(
          'xpack.security.management.apiKeys.apiKeyFlyout.invalidJsonError',
          {
            defaultMessage: 'Enter valid JSON.',
          }
        );
      }
    }
  }

  return errors;
}

export function mapCreateApiKeyValues(values: ApiKeyFormValues): CreateApiKeyRequest {
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

export function mapUpdateApiKeyValues(id: string, values: ApiKeyFormValues): UpdateApiKeyRequest {
  return {
    id,
    role_descriptors:
      values.customPrivileges && values.role_descriptors ? JSON.parse(values.role_descriptors) : {},
    metadata: values.includeMetadata && values.metadata ? JSON.parse(values.metadata) : {},
  };
}
