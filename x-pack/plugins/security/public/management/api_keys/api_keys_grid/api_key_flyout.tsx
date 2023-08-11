/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExclusiveUnion } from '@elastic/eui';
import {
  EuiCallOut,
  EuiCheckableCard,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Form, FormikProvider, useFormik } from 'formik';
import moment from 'moment-timezone';
import type { FunctionComponent } from 'react';
import React, { useEffect } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditorField, useKibana } from '@kbn/kibana-react-plugin/public';

import type { CategorizedApiKey } from './api_keys_grid_page';
import { ApiKeyBadge, ApiKeyStatus, TimeToolTip, UsernameWithIcon } from './api_keys_grid_page';
import type { ApiKeyRoleDescriptors } from '../../../../common/model';
import { DocLink } from '../../../components/doc_link';
import { FormField } from '../../../components/form_field';
import type { FormFlyoutProps } from '../../../components/form_flyout';
import { FormFlyout } from '../../../components/form_flyout';
import { FormRow } from '../../../components/form_row';
import { useCurrentUser } from '../../../components/use_current_user';
import { useInitialFocus } from '../../../components/use_initial_focus';
import { RolesAPIClient } from '../../roles/roles_api_client';
import { APIKeysAPIClient } from '../api_keys_api_client';
import type {
  CreateAPIKeyParams,
  CreateAPIKeyResult,
  UpdateAPIKeyParams,
  UpdateAPIKeyResult,
} from '../api_keys_api_client';

export interface ApiKeyFormValues {
  name: string;
  type: string;
  expiration: string;
  customExpiration: boolean;
  customPrivileges: boolean;
  includeMetadata: boolean;
  access: string;
  role_descriptors: string;
  metadata: string;
}

interface CommonApiKeyFlyoutProps {
  initialValues?: ApiKeyFormValues;
  onCancel: FormFlyoutProps['onCancel'];
  canManageCrossClusterApiKeys?: boolean;
  readOnly?: boolean;
}

interface CreateApiKeyFlyoutProps extends CommonApiKeyFlyoutProps {
  onSuccess?: (createApiKeyResponse: CreateAPIKeyResult) => void;
}

interface UpdateApiKeyFlyoutProps extends CommonApiKeyFlyoutProps {
  onSuccess?: (updateApiKeyResponse: UpdateAPIKeyResult) => void;
  apiKey: CategorizedApiKey;
}

export type ApiKeyFlyoutProps = ExclusiveUnion<CreateApiKeyFlyoutProps, UpdateApiKeyFlyoutProps>;

const defaultInitialValues: ApiKeyFormValues = {
  name: '',
  type: 'rest',
  customExpiration: false,
  expiration: '',
  includeMetadata: false,
  metadata: '{}',
  customPrivileges: false,
  access: JSON.stringify(
    {
      search: [
        {
          names: ['*'],
        },
      ],
      replication: [
        {
          names: ['*'],
        },
      ],
    },
    null,
    2
  ),
  role_descriptors: '{}',
};

export const ApiKeyFlyout: FunctionComponent<ApiKeyFlyoutProps> = ({
  onSuccess,
  onCancel,
  apiKey,
  canManageCrossClusterApiKeys = false,
  readOnly = false,
}) => {
  const { services } = useKibana();
  const { value: currentUser, loading: isLoadingCurrentUser } = useCurrentUser();
  const [{ value: roles, loading: isLoadingRoles }, getRoles] = useAsyncFn(
    () => new RolesAPIClient(services.http!).getRoles(),
    [services.http]
  );

  const formik = useFormik<ApiKeyFormValues>({
    onSubmit: async (values) => {
      try {
        if (apiKey) {
          const updateApiKeyResponse = await new APIKeysAPIClient(services.http!).updateApiKey(
            mapUpdateApiKeyValues(apiKey.type, apiKey.id, values)
          );

          onSuccess?.(updateApiKeyResponse);
        } else {
          const createApiKeyResponse = await new APIKeysAPIClient(services.http!).createApiKey(
            mapCreateApiKeyValues(values)
          );

          onSuccess?.(createApiKeyResponse);
        }
      } catch (error) {
        throw error;
      }
    },
    initialValues: apiKey ? mapApiKeyFormValues(apiKey) : defaultInitialValues,
  });

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

      if (!formik.touched.role_descriptors && !apiKey) {
        formik.setFieldValue('role_descriptors', JSON.stringify(userPermissions, null, 2));
      }
    }
  }, [currentUser, roles]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = isLoadingCurrentUser || isLoadingRoles;

  const isOwner = currentUser && apiKey ? currentUser.username === apiKey.username : false;
  const hasExpired = apiKey ? apiKey.expiration && moment(apiKey.expiration).isBefore() : false;
  const canEdit = isOwner && !hasExpired;

  const firstFieldRef = useInitialFocus<HTMLInputElement>([isLoading]);

  return (
    <FormikProvider value={formik}>
      <FormFlyout
        title={
          apiKey
            ? readOnly || !canEdit
              ? i18n.translate('xpack.security.accountManagement.apiKeyFlyout.viewTitle', {
                  defaultMessage: `API key details`,
                })
              : i18n.translate('xpack.security.accountManagement.apiKeyFlyout.updateTitle', {
                  defaultMessage: `Update API key`,
                })
            : i18n.translate('xpack.security.accountManagement.apiKeyFlyout.createTitle', {
                defaultMessage: `Create API key`,
              })
        }
        onCancel={onCancel}
        onSubmit={formik.submitForm}
        submitButtonText={
          apiKey
            ? i18n.translate('xpack.security.accountManagement.apiKeyFlyout.updateSubmitButton', {
                defaultMessage: `{isSubmitting, select, true{Updating API key…} other{Update API key}}`,
                values: { isSubmitting: formik.isSubmitting },
              })
            : i18n.translate('xpack.security.accountManagement.apiKeyFlyout.createSubmitButton', {
                defaultMessage: `{isSubmitting, select, true{Creating API key…} other{Create API key}}`,
                values: { isSubmitting: formik.isSubmitting },
              })
        }
        isLoading={formik.isSubmitting}
        isDisabled={
          isLoading ||
          (formik.submitCount > 0 && !formik.isValid) ||
          readOnly ||
          (apiKey && !canEdit)
        }
        isSubmitButtonHidden={readOnly || (apiKey && !canEdit)}
        size="m"
        ownFocus
      >
        <EuiSkeletonText isLoading={isLoading}>
          {apiKey && !readOnly ? (
            !isOwner ? (
              <>
                <EuiCallOut
                  iconType="lock"
                  title={
                    <FormattedMessage
                      id="xpack.security.accountManagement.apiKeyFlyout.readonlyOwnedByOtherUserWarning"
                      defaultMessage="You cannot update this API key, since it is owned by another user."
                    />
                  }
                />
                <EuiSpacer />
              </>
            ) : hasExpired ? (
              <>
                <EuiCallOut
                  iconType="lock"
                  title={
                    <FormattedMessage
                      id="xpack.security.accountManagement.apiKeyFlyout.readonlyExpiredWarning"
                      defaultMessage="You cannot update this API key, since it has already expired."
                    />
                  }
                />
                <EuiSpacer />
              </>
            ) : null
          ) : null}

          <Form>
            <FormRow
              label={
                <FormattedMessage
                  id="xpack.security.accountManagement.apiKeyFlyout.nameLabel"
                  defaultMessage="Name"
                />
              }
              fullWidth
            >
              <FormField
                name="name"
                inputRef={firstFieldRef}
                data-test-subj="apiKeyNameInput"
                disabled={readOnly || !!apiKey}
                validate={{
                  required: i18n.translate(
                    'xpack.security.management.apiKeys.apiKeyFlyout.nameRequired',
                    {
                      defaultMessage: 'Enter a name.',
                    }
                  ),
                }}
                fullWidth
              />
            </FormRow>

            {apiKey ? (
              <>
                <EuiSpacer />
                <EuiFlexGroup gutterSize="xl">
                  <EuiFlexItem grow={false}>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.security.accountManagement.apiKeyFlyout.typeLabel"
                          defaultMessage="Type"
                        />
                      }
                    >
                      <ApiKeyBadge type={apiKey.type} />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.security.accountManagement.apiKeyFlyout.ownerLabel"
                          defaultMessage="Owner"
                        />
                      }
                    >
                      <UsernameWithIcon username={apiKey.username} />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.security.accountManagement.apiKeyFlyout.createdLabel"
                          defaultMessage="Created"
                        />
                      }
                    >
                      <TimeToolTip timestamp={apiKey.creation} />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.security.accountManagement.apiKeyFlyout.statusLabel"
                          defaultMessage="Status"
                        />
                      }
                    >
                      <ApiKeyStatus expiration={apiKey.expiration} />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            ) : canManageCrossClusterApiKeys ? (
              <FormRow
                name="type"
                label={
                  <FormattedMessage
                    id="xpack.security.accountManagement.apiKeyFlyout.typeLabel"
                    defaultMessage="Type"
                  />
                }
                fullWidth
              >
                <EuiFlexGroup gutterSize="m">
                  <EuiFlexItem>
                    <EuiCheckableCard
                      id="rest"
                      label={
                        <>
                          <EuiTitle size="xxs">
                            <h2>
                              <FormattedMessage
                                id="xpack.security.accountManagement.apiKeyFlyout.restTypeLabel"
                                defaultMessage="Personal API key"
                              />
                            </h2>
                          </EuiTitle>
                          <EuiSpacer size="xs" />
                          <EuiText size="s">
                            <FormattedMessage
                              id="xpack.security.accountManagement.apiKeyFlyout.restTypeDescription"
                              defaultMessage="Allow external services to access the Elastic Stack on your behalf."
                            />
                          </EuiText>
                        </>
                      }
                      onChange={() => formik.setFieldValue('type', 'rest')}
                      checked={formik.values.type === 'rest'}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiCheckableCard
                      id="cross_cluster"
                      label={
                        <>
                          <EuiTitle size="xxs">
                            <h2>
                              <FormattedMessage
                                id="xpack.security.accountManagement.apiKeyFlyout.crossClusterTypeLabel"
                                defaultMessage="Cross-Cluster API key"
                              />
                            </h2>
                          </EuiTitle>
                          <EuiSpacer size="xs" />
                          <EuiText size="s">
                            <FormattedMessage
                              id="xpack.security.accountManagement.apiKeyFlyout.crossClusterTypeDescription"
                              defaultMessage="Allow remote clusters to connect to your local cluster."
                            />
                          </EuiText>
                        </>
                      }
                      onChange={() => formik.setFieldValue('type', 'cross_cluster')}
                      checked={formik.values.type === 'cross_cluster'}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </FormRow>
            ) : (
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.security.accountManagement.apiKeyFlyout.typeLabel"
                    defaultMessage="Type"
                  />
                }
              >
                <ApiKeyBadge type="rest" />
              </EuiFormRow>
            )}
            <EuiHorizontalRule />

            {formik.values.type === 'cross_cluster' ? (
              <FormRow
                data-test-subj="apiKeysAccessCodeEditor"
                label={
                  <FormattedMessage
                    id="xpack.security.accountManagement.apiKeyFlyout.accessLabel"
                    defaultMessage="Access"
                  />
                }
                helpText={
                  <DocLink
                    app="elasticsearch"
                    doc="security-api-create-cross-cluster-api-key.html#security-api-create-cross-cluster-api-key-request-body"
                  >
                    <FormattedMessage
                      id="xpack.security.accountManagement.apiKeyFlyout.accessHelpText"
                      defaultMessage="Learn how to structure access permissions."
                    />
                  </DocLink>
                }
                fullWidth
              >
                <FormField
                  as={CodeEditorField}
                  name="access"
                  value={formik.values.access}
                  options={{ readOnly: readOnly || (apiKey && !canEdit) }}
                  onChange={(value: string) => formik.setFieldValue('access', value)}
                  validate={(value: string) => {
                    if (!value) {
                      return i18n.translate(
                        'xpack.security.management.apiKeys.apiKeyFlyout.accessRequired',
                        {
                          defaultMessage: 'Enter access permissions or disable this option.',
                        }
                      );
                    }
                    try {
                      JSON.parse(value);
                    } catch (e) {
                      return i18n.translate(
                        'xpack.security.management.apiKeys.apiKeyFlyout.invalidJsonError',
                        {
                          defaultMessage: 'Enter valid JSON.',
                        }
                      );
                    }
                  }}
                  fullWidth
                  languageId="xjson"
                  height={200}
                />
              </FormRow>
            ) : (
              <EuiFormFieldset>
                <EuiSwitch
                  label={
                    <FormattedMessage
                      id="xpack.security.accountManagement.apiKeyFlyout.customPrivilegesLabel"
                      defaultMessage="Restrict privileges"
                    />
                  }
                  checked={formik.values.customPrivileges}
                  data-test-subj="apiKeysRoleDescriptorsSwitch"
                  onChange={(e) => formik.setFieldValue('customPrivileges', e.target.checked)}
                  disabled={readOnly || (apiKey && !canEdit)}
                />
                {formik.values.customPrivileges && (
                  <>
                    <EuiSpacer size="m" />
                    <FormRow
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
                      fullWidth
                      data-test-subj="apiKeysRoleDescriptorsCodeEditor"
                    >
                      <FormField
                        as={CodeEditorField}
                        name="role_descriptors"
                        value={formik.values.role_descriptors}
                        options={{ readOnly: readOnly || (apiKey && !canEdit) }}
                        onChange={(value: string) =>
                          formik.setFieldValue('role_descriptors', value)
                        }
                        validate={(value: string) => {
                          if (!value) {
                            return i18n.translate(
                              'xpack.security.management.apiKeys.apiKeyFlyout.roleDescriptorsRequired',
                              {
                                defaultMessage: 'Enter role descriptors or disable this option.',
                              }
                            );
                          }
                          try {
                            JSON.parse(value);
                          } catch (e) {
                            return i18n.translate(
                              'xpack.security.management.apiKeys.apiKeyFlyout.invalidJsonError',
                              {
                                defaultMessage: 'Enter valid JSON.',
                              }
                            );
                          }
                        }}
                        fullWidth
                        languageId="xjson"
                        height={200}
                      />
                    </FormRow>
                    <EuiSpacer size="s" />
                  </>
                )}
              </EuiFormFieldset>
            )}

            {!apiKey && (
              <>
                <EuiSpacer />
                <EuiFormFieldset>
                  <EuiSwitch
                    label={
                      <FormattedMessage
                        id="xpack.security.accountManagement.apiKeyFlyout.customExpirationLabel"
                        defaultMessage="Expire after time"
                      />
                    }
                    checked={formik.values.customExpiration}
                    onChange={(e) => formik.setFieldValue('customExpiration', e.target.checked)}
                    disabled={readOnly || !!apiKey}
                    data-test-subj="apiKeyCustomExpirationSwitch"
                  />
                  {formik.values.customExpiration && (
                    <>
                      <EuiSpacer size="m" />
                      <FormRow
                        label={
                          <FormattedMessage
                            id="xpack.security.accountManagement.apiKeyFlyout.customExpirationInputLabel"
                            defaultMessage="Lifetime"
                          />
                        }
                        fullWidth
                      >
                        <FormField
                          as={EuiFieldNumber}
                          name="expiration"
                          min={0}
                          append={i18n.translate(
                            'xpack.security.accountManagement.apiKeyFlyout.expirationUnit',
                            {
                              defaultMessage: 'days',
                            }
                          )}
                          validate={{
                            min: {
                              value: 1,
                              message: i18n.translate(
                                'xpack.security.management.apiKeys.apiKeyFlyout.expirationRequired',
                                {
                                  defaultMessage: 'Enter a valid duration or disable this option.',
                                }
                              ),
                            },
                          }}
                          disabled={readOnly || !!apiKey}
                          data-test-subj="apiKeyCustomExpirationInput"
                        />
                      </FormRow>
                      <EuiSpacer size="s" />
                    </>
                  )}
                </EuiFormFieldset>
              </>
            )}
            <EuiSpacer />
            <EuiFormFieldset>
              <EuiSwitch
                label={
                  <FormattedMessage
                    id="xpack.security.accountManagement.apiKeyFlyout.includeMetadataLabel"
                    defaultMessage="Include metadata"
                  />
                }
                data-test-subj="apiKeysMetadataSwitch"
                checked={formik.values.includeMetadata}
                disabled={readOnly || (apiKey && !canEdit)}
                onChange={(e) => formik.setFieldValue('includeMetadata', e.target.checked)}
              />
              {formik.values.includeMetadata && (
                <>
                  <EuiSpacer size="m" />
                  <FormRow
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
                    fullWidth
                  >
                    <FormField
                      as={CodeEditorField}
                      name="metadata"
                      options={{ readOnly: readOnly || (apiKey && !canEdit) }}
                      value={formik.values.metadata}
                      onChange={(value: string) => formik.setFieldValue('metadata', value)}
                      validate={(value: string) => {
                        if (!value) {
                          return i18n.translate(
                            'xpack.security.management.apiKeys.apiKeyFlyout.metadataRequired',
                            {
                              defaultMessage: 'Enter metadata or disable this option.',
                            }
                          );
                        }
                        try {
                          JSON.parse(value);
                        } catch (e) {
                          return i18n.translate(
                            'xpack.security.management.apiKeys.apiKeyFlyout.invalidJsonError',
                            {
                              defaultMessage: 'Enter valid JSON.',
                            }
                          );
                        }
                      }}
                      fullWidth
                      languageId="xjson"
                      height={200}
                    />
                  </FormRow>
                  <EuiSpacer size="s" />
                </>
              )}
            </EuiFormFieldset>
          </Form>
        </EuiSkeletonText>
      </FormFlyout>
    </FormikProvider>
  );
};

export function mapCreateApiKeyValues(values: ApiKeyFormValues): CreateAPIKeyParams {
  const { type, name } = values;
  const expiration = values.customExpiration ? `${values.expiration}d` : undefined;
  const metadata = values.includeMetadata ? JSON.parse(values.metadata) : '{}';

  if (type === 'cross_cluster') {
    return {
      type,
      name,
      expiration,
      metadata,
      access: JSON.parse(values.access),
    };
  }

  return {
    name,
    expiration,
    metadata,
    role_descriptors: values.customPrivileges ? JSON.parse(values.role_descriptors) : '{}',
  };
}

export function mapUpdateApiKeyValues(
  type: CategorizedApiKey['type'],
  id: string,
  values: ApiKeyFormValues
): UpdateAPIKeyParams {
  const metadata = values.includeMetadata ? JSON.parse(values.metadata) : '{}';

  if (type === 'cross_cluster') {
    return {
      type,
      id,
      metadata,
      access: JSON.parse(values.access),
    };
  }

  return {
    id,
    metadata,
    role_descriptors: values.customPrivileges ? JSON.parse(values.role_descriptors) : '{}',
  };
}

/**
 * Maps data from the selected API key to pre-populate the form
 */
function mapApiKeyFormValues(apiKey: CategorizedApiKey): ApiKeyFormValues {
  const includeMetadata = Object.keys(apiKey.metadata).length > 0;
  const customPrivileges =
    apiKey.type !== 'cross_cluster' ? Object.keys(apiKey.role_descriptors).length > 0 : false;

  return {
    name: apiKey.name,
    type: apiKey.type,
    customExpiration: !!apiKey.expiration,
    expiration: !!apiKey.expiration ? apiKey.expiration.toString() : '',
    includeMetadata,
    metadata: includeMetadata ? JSON.stringify(apiKey.metadata, null, 2) : '{}',
    customPrivileges,
    role_descriptors: customPrivileges
      ? JSON.stringify(apiKey.type !== 'cross_cluster' && apiKey.role_descriptors, null, 2)
      : '{}',
    access: apiKey.type === 'cross_cluster' ? JSON.stringify(apiKey.access, null, 2) : '{}',
  };
}
