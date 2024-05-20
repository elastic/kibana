/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useState } from 'react';

import { css } from '@emotion/react';

import { useValues, useActions } from 'kea';

import {
  useEuiTheme,
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiPanel,
  EuiStep,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../common/types/api';

import { CreateApiKeyAPILogic } from '../../enterprise_search_overview/api/create_elasticsearch_api_key_logic';

import { KibanaLogic } from '../kibana';

import { BasicSetupForm, DEFAULT_EXPIRES_VALUE } from './basic_setup_form';
import { MetadataForm } from './metadata_form';
import { SecurityPrivilegesForm } from './security_privileges_form';

const DEFAULT_ROLE_DESCRIPTORS = `{
  "enterprise_search": {
    "indices": [{
      "names": ["*"],
      "privileges": [
        "all"
      ]
    }]
  }
}`;
const DEFAULT_METADATA = `{
  "application": "myapp"
}`;

interface CreateApiKeyFlyoutProps {
  onClose: () => void;
}

export const CANCEL_LABEL: string = i18n.translate('xpack.enterpriseSearch.cancel', {
  defaultMessage: 'Cancel',
});

export const EDIT_LABEL: string = i18n.translate('xpack.enterpriseSearch.edit', {
  defaultMessage: 'Edit',
});

export const SAVE_LABEL: string = i18n.translate('xpack.enterpriseSearch.save', {
  defaultMessage: 'Save',
});

const REQUIRED_LABEL: string = i18n.translate('xpack.enterpriseSearch.required', {
  defaultMessage: 'Required',
});

const ENABLED_LABEL: string = i18n.translate('xpack.enterpriseSearch.enabled', {
  defaultMessage: 'Enabled',
});

const DISABLED_LABEL: string = i18n.translate('xpack.enterpriseSearch.disabled', {
  defaultMessage: 'Disabled',
});

const INVALID_JSON_ERROR: string = i18n.translate('xpack.enterpriseSearch.invalidJsonError', {
  defaultMessage: 'Invalid JSON',
});

export const CreateApiKeyFlyout: React.FC<CreateApiKeyFlyoutProps> = ({ onClose }) => {
  const { euiTheme } = useEuiTheme();
  const [name, setName] = useState('');
  const [expires, setExpires] = useState<string | null>(DEFAULT_EXPIRES_VALUE);
  const [roleDescriptors, setRoleDescriptors] = useState(DEFAULT_ROLE_DESCRIPTORS);
  const [roleDescriptorsError, setRoleDescriptorsError] = useState<string | undefined>(undefined);
  const [metadata, setMetadata] = useState(DEFAULT_METADATA);
  const [metadataError, setMetadataError] = useState<string | undefined>(undefined);
  const [privilegesEnabled, setPrivilegesEnabled] = useState<boolean>(false);
  const [privilegesOpen, setPrivilegesOpen] = useState<'open' | 'closed'>('closed');
  const [metadataEnabled, setMetadataEnabled] = useState<boolean>(false);
  const [metadataOpen, setMetadataOpen] = useState<'open' | 'closed'>('closed');

  const { user } = useValues(KibanaLogic);
  const { makeRequest: saveApiKey, apiReset } = useActions(CreateApiKeyAPILogic);
  const { data: createdApiKey, error, status } = useValues(CreateApiKeyAPILogic);

  const isLoading = status === Status.LOADING;

  const username = user?.full_name || user?.username || user?.email || '';

  const togglePrivileges = (e: EuiSwitchEvent) => {
    const enabled = e.target.checked;
    setPrivilegesEnabled(enabled);
    setPrivilegesOpen(enabled ? 'open' : 'closed');
    // Reset role descriptors to default
    if (enabled) setRoleDescriptors(DEFAULT_ROLE_DESCRIPTORS);
  };
  const toggleMetadata = (e: EuiSwitchEvent) => {
    const enabled = e.target.checked;
    setMetadataEnabled(enabled);
    setMetadataOpen(enabled ? 'open' : 'closed');
    // Reset metadata to default
    if (enabled) setMetadata(DEFAULT_METADATA);
  };
  const onCreateClick = () => {
    let parsedRoleDescriptors: Record<string, unknown> | undefined;
    if (privilegesEnabled) {
      try {
        parsedRoleDescriptors =
          roleDescriptors.length > 0 ? JSON.parse(roleDescriptors) : undefined;
      } catch (e) {
        setRoleDescriptorsError(INVALID_JSON_ERROR);
        return;
      }
    }
    if (roleDescriptorsError) setRoleDescriptorsError(undefined);
    let parsedMetadata: Record<string, unknown> | undefined;
    if (metadataEnabled) {
      try {
        parsedMetadata = metadata.length > 0 ? JSON.parse(metadata) : undefined;
      } catch (e) {
        setMetadataError(INVALID_JSON_ERROR);
        return;
      }
    }
    if (metadataError) setMetadataError(undefined);
    const expiration = expires !== null ? `${expires}d` : undefined;

    saveApiKey({
      expiration,
      metadata: parsedMetadata,
      name,
      role_descriptors: parsedRoleDescriptors,
    });
  };

  const apiKeyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (createdApiKey && apiKeyRef) {
      apiKeyRef.current?.scrollIntoView();
    }
  }, [createdApiKey, apiKeyRef]);

  const closeFlyOut = () => {
    apiReset();
    onClose();
  };

  return (
    <EuiFlyout
      onClose={closeFlyOut}
      css={css`
        max-width: calc(${euiTheme.size.xxxxl} * 10);
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.enterpriseSearch.apiKey.flyoutTitle', {
              defaultMessage: 'Create an API key',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div ref={apiKeyRef} />
        {createdApiKey && (
          <>
            <EuiSpacer />
            <EuiPanel color="success" data-test-subj="api-key-create-success-panel">
              <EuiStep
                css={css`
                  .euiStep__content {
                    padding-bottom: 0;
                  }
                `}
                status="complete"
                headingElement="h3"
                title={i18n.translate('xpack.enterpriseSearch.apiKey.apiKeyStepTitle', {
                  defaultMessage: 'Store this API key',
                })}
                titleSize="xs"
              >
                <EuiText>
                  {i18n.translate('xpack.enterpriseSearch.apiKey.apiKeyStepDescription', {
                    defaultMessage:
                      "You'll only see this key once, so save it somewhere safe. We don't store your API keys, so if you lose a key you'll need to generate a replacement.",
                  })}
                </EuiText>
                <EuiSpacer size="s" />
                <EuiCodeBlock isCopyable data-test-subj="api-key-created-key-codeblock">
                  {JSON.stringify(createdApiKey, undefined, 2)}
                </EuiCodeBlock>
              </EuiStep>
            </EuiPanel>
            <EuiSpacer />
          </>
        )}
        {error && (
          <EuiCallOut
            color="danger"
            iconType="warning"
            title={i18n.translate('xpack.enterpriseSearch.apiKey.flyout.errorTitle', {
              defaultMessage: 'Error creating API key',
            })}
            data-test-subj="create-api-key-error-callout"
          >
            {error.body?.message}
          </EuiCallOut>
        )}
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
                        {i18n.translate('xpack.enterpriseSearch.apiKey.setup.title', {
                          defaultMessage: 'Setup',
                        })}
                      </h4>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <EuiText color="subdued" size="xs">
                  <p>
                    {i18n.translate('xpack.enterpriseSearch.apiKey.setup.description', {
                      defaultMessage: 'Basic configuration details to create your API key.',
                    })}
                  </p>
                </EuiText>
              </div>
            }
            extraAction={<EuiBadge color="hollow">{REQUIRED_LABEL}</EuiBadge>}
          >
            <EuiSpacer size="s" />
            <BasicSetupForm
              isLoading={isLoading}
              name={name}
              user={username}
              expires={expires}
              onChangeName={(newName: string) => setName(newName)}
              onChangeExpires={(newExpires: string | null) => setExpires(newExpires)}
            />
          </EuiAccordion>
        </EuiPanel>
        <EuiSpacer size="l" />
        <EuiPanel hasBorder>
          <EuiAccordion
            id="apiKey.privileges"
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
                        {i18n.translate('xpack.enterpriseSearch.apiKey.privileges.title', {
                          defaultMessage: 'Security Privileges',
                        })}
                      </h4>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <EuiText color="subdued" size="xs">
                  <p>
                    {i18n.translate('xpack.enterpriseSearch.apiKey.privileges.description', {
                      defaultMessage:
                        'Control access to specific Elasticsearch APIs and resources using predefined roles or custom privileges per API key.',
                    })}
                  </p>
                </EuiText>
              </div>
            }
            extraAction={
              <EuiSwitch
                label={privilegesEnabled ? ENABLED_LABEL : DISABLED_LABEL}
                checked={privilegesEnabled}
                onChange={togglePrivileges}
                data-test-subj="create-api-role-descriptors-switch"
              />
            }
            forceState={privilegesOpen}
            onToggle={(isOpen) => {
              if (privilegesEnabled) {
                setPrivilegesOpen(isOpen ? 'open' : 'closed');
              }
            }}
          >
            <EuiSpacer size="s" />
            <SecurityPrivilegesForm
              roleDescriptors={roleDescriptors}
              onChangeRoleDescriptors={setRoleDescriptors}
              error={roleDescriptorsError}
            />
          </EuiAccordion>
        </EuiPanel>
        <EuiSpacer size="l" />
        <EuiPanel hasBorder>
          <EuiAccordion
            id="apiKey.metadata"
            paddingSize="l"
            buttonContent={
              <div style={{ paddingRight: euiTheme.size.s }}>
                <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="visVega" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h4>
                        {i18n.translate('xpack.enterpriseSearch.apiKey.metadata.title', {
                          defaultMessage: 'Metadata',
                        })}
                      </h4>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <EuiText color="subdued" size="xs">
                  <p>
                    {i18n.translate('xpack.enterpriseSearch.apiKey.metadata.description', {
                      defaultMessage:
                        'Use configurable key-value pairs to add information about the API key or customize Elasticsearch resource access.',
                    })}
                  </p>
                </EuiText>
              </div>
            }
            extraAction={
              <EuiSwitch
                label={metadataEnabled ? ENABLED_LABEL : DISABLED_LABEL}
                checked={metadataEnabled}
                onChange={toggleMetadata}
                data-test-subj="create-api-metadata-switch"
              />
            }
            forceState={metadataOpen}
            onToggle={(isOpen) => {
              if (metadataEnabled) {
                setMetadataOpen(isOpen ? 'open' : 'closed');
              }
            }}
          >
            <EuiSpacer size="s" />
            <MetadataForm
              metadata={metadata}
              onChangeMetadata={setMetadata}
              error={metadataError}
            />
          </EuiAccordion>
        </EuiPanel>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isDisabled={isLoading}
              onClick={closeFlyOut}
              data-test-subj="create-api-key-cancel"
            >
              {CANCEL_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem>
                <EuiButton
                  fill
                  disabled={!name}
                  isLoading={isLoading}
                  onClick={onCreateClick}
                  data-test-subj="create-api-key-submit"
                >
                  {i18n.translate('xpack.enterpriseSearch.apiKey.flyOutCreateLabel', {
                    defaultMessage: 'Create API Key',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
