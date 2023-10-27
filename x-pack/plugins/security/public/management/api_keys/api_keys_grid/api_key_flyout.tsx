/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExclusiveUnion } from '@elastic/eui';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckableCard,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiRadioGroup,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { Form, FormikProvider, useFormik } from 'formik';
import moment from 'moment-timezone';
import type { FunctionComponent } from 'react';
import React, { useEffect } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';

import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import { CodeEditorField, useKibana } from '@kbn/kibana-react-plugin/public';

import type { CategorizedApiKey } from './api_keys_grid_page';
import { ApiKeyBadge, ApiKeyStatus, TimeToolTip, UsernameWithIcon } from './api_keys_grid_page';
import type { ApiKeyRoleDescriptors } from '../../../../common/model';
import { DocLink } from '../../../components/doc_link';
import { FormField } from '../../../components/form_field';
import { FormRow } from '../../../components/form_row';
import { useCurrentUser } from '../../../components/use_current_user';
import { useHtmlId } from '../../../components/use_html_id';
import { useInitialFocus } from '../../../components/use_initial_focus';
import { RolesAPIClient } from '../../roles/roles_api_client';
import { APIKeysAPIClient } from '../api_keys_api_client';
import type {
  CreateAPIKeyParams,
  CreateAPIKeyResult,
  UpdateAPIKeyParams,
  UpdateAPIKeyResult,
} from '../api_keys_api_client';

export const DEFAULT_EXPIRATION_VALUE = '60';

export const ENABLED_LABEL: string = i18n.translate(
  'xpack.security.accountManagement.apiKeyFlyout.enabledLabel',
  {
    defaultMessage: 'Enabled',
  }
);

export const DISABLED_LABEL: string = i18n.translate(
  'xpack.security.accountManagement.apiKeyFlyout.disabledLabel',
  {
    defaultMessage: 'Disabled',
  }
);

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
  onCancel(): void;
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
  const { euiTheme } = useEuiTheme();
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

  const titleId = useHtmlId('formFlyout', 'title');
  const isSubmitButtonHidden = readOnly || (apiKey && !canEdit);

  const isSubmitDisabled =
    isLoading || (formik.submitCount > 0 && !formik.isValid) || readOnly || (apiKey && !canEdit);

  const title = apiKey
    ? readOnly || !canEdit
      ? i18n.translate('xpack.security.accountManagement.apiKeyFlyout.viewTitle', {
          defaultMessage: `API key details`,
        })
      : i18n.translate('xpack.security.accountManagement.apiKeyFlyout.updateTitle', {
          defaultMessage: `Update API key`,
        })
    : i18n.translate('xpack.security.accountManagement.apiKeyFlyout.createTitle', {
        defaultMessage: `Create API key`,
      });

  const submitButtonText = apiKey
    ? i18n.translate('xpack.security.accountManagement.apiKeyFlyout.updateSubmitButton', {
        defaultMessage: `{isSubmitting, select, true{Updating API key…} other{Update API key}}`,
        values: { isSubmitting: formik.isSubmitting },
      })
    : i18n.translate('xpack.security.accountManagement.apiKeyFlyout.createSubmitButton', {
        defaultMessage: `{isSubmitting, select, true{Creating API key…} other{Create API key}}`,
        values: { isSubmitting: formik.isSubmitting },
      });

  let expirationDate: Date | undefined;
  if (formik.values.customExpiration) {
    expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(formik.values.expiration, 10));
  }

  return (
    <FormikProvider value={formik}>
      <EuiFlyout onClose={onCancel} aria-labelledby={titleId} size="m" ownFocus>
        <Form
          onSubmit={formik.handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={titleId}>{title}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
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
              <EuiPanel hasBorder>
                <EuiAccordion
                  id="apiKey.setup"
                  paddingSize="l"
                  initialIsOpen
                  buttonContent={
                    <div>
                      <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
                        <EuiFlexItem grow={false}>
                          <EuiIcon type="gear" />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiTitle size="xs">
                            <h4>
                              <FormattedMessage
                                id="xpack.security.accountManagement.apiKeyFlyout.setup.title"
                                defaultMessage="Setup"
                              />
                            </h4>
                          </EuiTitle>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="xs" />
                      <EuiText color="subdued" size="xs">
                        <p>
                          <FormattedMessage
                            id="xpack.security.accountManagement.apiKeyFlyout.setup.description"
                            defaultMessage="Basic configuration details to create your API key."
                          />
                          {i18n.translate(
                            'xpack.security.accountManagement.apiKeyFlyout.setup.description',
                            {
                              defaultMessage: 'Basic configuration details to create your API key.',
                            }
                          )}
                        </p>
                      </EuiText>
                    </div>
                  }
                  extraAction={
                    !apiKey && (
                      <EuiBadge color="hollow">
                        <FormattedMessage
                          id="xpack.security.accountManagement.apiKeyFlyout.setup.requiredBadge"
                          defaultMessage="Required"
                        />
                      </EuiBadge>
                    )
                  }
                >
                  <EuiSpacer size="s" />
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

                  {!apiKey && (
                    <EuiFormRow
                      fullWidth
                      labelAppend={
                        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="warning" size="s" color="subdued" />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiText color="subdued" size="xs">
                              <FormattedMessage
                                id="xpack.security.accountManagement.apiKeyFlyout.expiresFieldHelpText"
                                defaultMessage="API keys should be rotated regularly."
                              />
                            </EuiText>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      }
                      label={
                        <FormattedMessage
                          id="xpack.security.accountManagement.apiKeyFlyout.expiresLabel"
                          defaultMessage="Expires"
                        />
                      }
                    >
                      <>
                        <EuiRadioGroup
                          options={[
                            {
                              id: 'never',
                              label: (
                                <span data-test-subj="apiKeyExpiresNeverRadio">
                                  <FormattedMessage
                                    id="xpack.security.accountManagement.apiKeyFlyout.expires.neverLabel"
                                    defaultMessage="Never"
                                  />
                                </span>
                              ),
                            },
                            {
                              id: 'days',
                              label: (
                                <span data-test-subj="apiKeyCustomExpirationSwitch">
                                  <FormattedMessage
                                    id="xpack.security.accountManagement.apiKeyFlyout.expires.daysLabel"
                                    defaultMessage="in days"
                                  />
                                </span>
                              ),
                            },
                          ]}
                          idSelected={formik.values.customExpiration ? 'days' : 'never'}
                          data-test-subj="apiKeyExpiresRadio"
                          onChange={(id) => {
                            const customExpiration = id === 'days';
                            formik.setFieldValue(
                              'expiration',
                              customExpiration ? DEFAULT_EXPIRATION_VALUE : ''
                            );
                            formik.setFieldValue('customExpiration', customExpiration);
                          }}
                        />
                        {formik.values.customExpiration && (
                          <EuiFormRow
                            fullWidth
                            helpText={
                              <FormattedMessage
                                id="xpack.security.accountManagement.apiKeyFlyout.expirationHelpText"
                                defaultMessage="This API Key will expire on {expirationDate}"
                                values={{
                                  expirationDate: (
                                    <strong>
                                      <FormattedDate
                                        year="numeric"
                                        month="long"
                                        day="numeric"
                                        value={expirationDate!}
                                      />
                                    </strong>
                                  ),
                                }}
                              />
                            }
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
                                      defaultMessage:
                                        'Enter a valid duration or disable this option.',
                                    }
                                  ),
                                },
                              }}
                              disabled={readOnly || !!apiKey}
                              data-test-subj="apiKeyCustomExpirationInput"
                            />
                          </EuiFormRow>
                        )}
                      </>
                    </EuiFormRow>
                  )}
                </EuiAccordion>
              </EuiPanel>
              <EuiSpacer size="l" />
              {formik.values.type === 'cross_cluster' ? (
                <EuiPanel hasBorder>
                  <EuiAccordion
                    id="apiKeyCrossClusterAccess"
                    initialIsOpen
                    paddingSize="l"
                    buttonContent={
                      <div style={{ paddingRight: euiTheme.size.s }}>
                        <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="lock" />
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <EuiTitle size="xs">
                              <h4>
                                {i18n.translate(
                                  'xpack.security.accountManagement.apiKeyFlyout.accessPermissions.title',
                                  {
                                    defaultMessage: 'Access Permissions',
                                  }
                                )}
                              </h4>
                            </EuiTitle>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </div>
                    }
                  >
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
                        aria-label={i18n.translate(
                          'xpack.security.management.apiKeys.apiKeyFlyout.accessCodeEditor',
                          {
                            defaultMessage: 'Code editor for access permissions',
                          }
                        )}
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
                  </EuiAccordion>
                </EuiPanel>
              ) : (
                <EuiPanel hasBorder>
                  <EuiAccordion
                    id="apiKeyPrivileges"
                    paddingSize="l"
                    forceState={formik.values.customPrivileges ? 'open' : 'closed'}
                    onToggle={(isOpen) => formik.setFieldValue('customPrivileges', isOpen)}
                    buttonContent={
                      <div style={{ paddingRight: euiTheme.size.s }}>
                        <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="lock" />
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <EuiTitle size="xs">
                              <h4>
                                {i18n.translate(
                                  'xpack.security.accountManagement.apiKeyFlyout.privileges.title',
                                  {
                                    defaultMessage: 'Security Privileges',
                                  }
                                )}
                              </h4>
                            </EuiTitle>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                        <EuiSpacer size="xs" />
                        <EuiText color="subdued" size="xs">
                          <p>
                            {i18n.translate(
                              'xpack.security.accountManagement.apiKeyFlyout.privileges.description',
                              {
                                defaultMessage:
                                  'Control access to specific Elasticsearch APIs and resources using predefined roles or custom privileges per API key.',
                              }
                            )}
                          </p>
                        </EuiText>
                      </div>
                    }
                    extraAction={
                      <EuiSwitch
                        label={formik.values.customPrivileges ? ENABLED_LABEL : DISABLED_LABEL}
                        checked={formik.values.customPrivileges}
                        data-test-subj="apiKeysRoleDescriptorsSwitch"
                        onChange={(e) => formik.setFieldValue('customPrivileges', e.target.checked)}
                        disabled={readOnly || (apiKey && !canEdit)}
                      />
                    }
                  >
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
                        aria-label={i18n.translate(
                          'xpack.security.management.apiKeys.apiKeyFlyout.roleDescriptorsCodeEditor',
                          {
                            defaultMessage: 'Code editor for role descriptors of this API key',
                          }
                        )}
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
                  </EuiAccordion>
                </EuiPanel>
              )}
              <EuiSpacer size="l" />
              <EuiPanel hasBorder>
                <EuiAccordion
                  id="apiKeyMetadata"
                  paddingSize="l"
                  forceState={formik.values.includeMetadata ? 'open' : 'closed'}
                  onToggle={(isOpen) => formik.setFieldValue('includeMetadata', isOpen)}
                  buttonContent={
                    <div style={{ paddingRight: euiTheme.size.s }}>
                      <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
                        <EuiFlexItem grow={false}>
                          <EuiIcon type="visVega" />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiTitle size="xs">
                            <h4>
                              <FormattedMessage
                                id="xpack.security.accountManagement.apiKeyFlyout.metadata.title"
                                defaultMessage="Metadata"
                              />
                            </h4>
                          </EuiTitle>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="xs" />
                      <EuiText color="subdued" size="xs">
                        <p>
                          <FormattedMessage
                            id="xpack.security.accountManagement.apiKeyFlyout.metadata.description"
                            defaultMessage="Use configurable key-value pairs to add information about the API key or customize Elasticsearch resource access."
                          />
                        </p>
                      </EuiText>
                    </div>
                  }
                  extraAction={
                    <EuiSwitch
                      label={formik.values.includeMetadata ? ENABLED_LABEL : DISABLED_LABEL}
                      data-test-subj="apiKeysMetadataSwitch"
                      checked={formik.values.includeMetadata}
                      disabled={readOnly || (apiKey && !canEdit)}
                      onChange={(e) => formik.setFieldValue('includeMetadata', e.target.checked)}
                    />
                  }
                >
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
                      aria-label={i18n.translate(
                        'xpack.security.management.apiKeys.apiKeyFlyout.metadataCodeEditor',
                        {
                          defaultMessage:
                            'Code editor for arbitrary metadata associated with the API key',
                        }
                      )}
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
                </EuiAccordion>
              </EuiPanel>
            </EuiSkeletonText>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="formFlyoutCancelButton"
                  flush="right"
                  isDisabled={isLoading}
                  onClick={onCancel}
                >
                  <FormattedMessage
                    id="xpack.security.formFlyout.cancelButton"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              {!isSubmitButtonHidden && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="formFlyoutSubmitButton"
                    isLoading={formik.isSubmitting}
                    isDisabled={isSubmitDisabled}
                    fill
                    type="submit"
                  >
                    {submitButtonText}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </Form>
      </EuiFlyout>
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
