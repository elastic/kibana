/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';

import {
  useEuiTheme,
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  CANCEL_LABEL,
  DISABLED_LABEL,
  ENABLED_LABEL,
  INVALID_JSON_ERROR,
  REQUIRED_LABEL,
} from '../../../../common/i18n_string';
import { isApiError } from '../../../utils/api';
import { BasicSetupForm, DEFAULT_EXPIRES_VALUE } from './basic_setup_form';
import { MetadataForm } from './metadata_form';
import { SecurityPrivilegesForm } from './security_privileges_form';
import { CreateApiKeyResponse, useCreateApiKey } from '../../hooks/api/use_create_api_key';

const DEFAULT_ROLE_DESCRIPTORS = `{
  "serverless_search": {
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
  setApiKey: (apiKey: CreateApiKeyResponse) => void;
  username: string;
}

const parseCreateError = (error: unknown): string | undefined => {
  if (!error) return undefined;
  if (isApiError(error)) {
    return error.body.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
};

export const CreateApiKeyFlyout: React.FC<CreateApiKeyFlyoutProps> = ({
  onClose,
  username,
  setApiKey,
}) => {
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
    let parsedRoleDescriptors: Record<string, any> | undefined;
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
    let parsedMetadata: Record<string, any> | undefined;
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

    mutate({
      expiration,
      metadata: parsedMetadata,
      name,
      role_descriptors: parsedRoleDescriptors,
    });
  };

  const { data, isLoading, isError, isSuccess, error, mutate } = useCreateApiKey();

  useEffect(() => {
    if (isSuccess) {
      setApiKey(data);
      onClose();
    }
  });

  const createError = parseCreateError(error);
  return (
    <EuiFlyout
      onClose={onClose}
      css={css`
        max-width: calc(${euiTheme.size.xxxxl} * 10);
      `}
    >
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.serverlessSearch.apiKey.flyoutTitle', {
              defaultMessage: 'Create an API key',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isError && createError && (
          <EuiCallOut
            color="danger"
            iconType="warning"
            title={i18n.translate('xpack.serverlessSearch.apiKey.flyout.errorTitle', {
              defaultMessage: 'Error creating API key',
            })}
            data-test-subj="create-api-key-error-callout"
          >
            {createError}
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
                        {i18n.translate('xpack.serverlessSearch.apiKey.setup.title', {
                          defaultMessage: 'Setup',
                        })}
                      </h4>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <EuiText color="subdued" size="xs">
                  <p>
                    {i18n.translate('xpack.serverlessSearch.apiKey.setup.description', {
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
                        {i18n.translate('xpack.serverlessSearch.apiKey.privileges.title', {
                          defaultMessage: 'Security Privileges',
                        })}
                      </h4>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <EuiText color="subdued" size="xs">
                  <p>
                    {i18n.translate('xpack.serverlessSearch.apiKey.privileges.description', {
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
                        {i18n.translate('xpack.serverlessSearch.apiKey.metadata.title', {
                          defaultMessage: 'Metadata',
                        })}
                      </h4>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <EuiText color="subdued" size="xs">
                  <p>
                    {i18n.translate('xpack.serverlessSearch.apiKey.metadata.description', {
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
              onClick={onClose}
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
                  {i18n.translate('xpack.serverlessSearch.apiKey.flyOutCreateLabel', {
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
