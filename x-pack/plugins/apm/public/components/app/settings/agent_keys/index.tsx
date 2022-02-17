/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Fragment, useState } from 'react';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiButton,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { PermissionDenied } from './prompts/permission_denied';
import { ApiKeysNotEnabled } from './prompts/api_keys_not_enabled';
import { AgentKeysTable } from './agent_keys_table';
import { CreateAgentKeyFlyout } from './create_agent_key';
import { AgentKeyCallOut } from './create_agent_key/agent_key_callout';
import { CreateApiKeyResponse } from '../../../../../common/agent_key_types';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { ApiKey } from '../../../../../../security/common/model';

const INITIAL_DATA = {
  areApiKeysEnabled: false,
  canManage: false,
};

export function AgentKeys() {
  const { toasts } = useApmPluginContext().core.notifications;

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [createdAgentKey, setCreatedAgentKey] =
    useState<CreateApiKeyResponse>();

  const {
    data: { areApiKeysEnabled, canManage } = INITIAL_DATA,
    status: privilegesStatus,
  } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/agent_keys/privileges');
    },
    [],
    { showToastOnError: false }
  );

  const {
    data,
    status,
    refetch: refetchAgentKeys,
  } = useFetcher(
    (callApmApi) => {
      if (areApiKeysEnabled && canManage) {
        return callApmApi('GET /internal/apm/agent_keys');
      }
    },
    [areApiKeysEnabled, canManage],
    { showToastOnError: false }
  );

  const agentKeys = data?.agentKeys;

  return (
    <Fragment>
      <EuiText color="subdued">
        {i18n.translate('xpack.apm.settings.agentKeys.descriptionText', {
          defaultMessage:
            'View and delete APM agent keys. An APM agent key sends requests on behalf of a user.',
        })}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>
              {i18n.translate('xpack.apm.settings.agentKeys.title', {
                defaultMessage: 'APM agent keys',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        {areApiKeysEnabled && canManage && !isEmpty(agentKeys) && (
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => setIsFlyoutVisible(true)}
              fill={true}
              iconType="plusInCircle"
            >
              {i18n.translate(
                'xpack.apm.settings.agentKeys.createAgentKeyButton',
                {
                  defaultMessage: 'Create APM agent key',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {createdAgentKey && (
        <AgentKeyCallOut
          name={createdAgentKey.name}
          token={btoa(`${createdAgentKey.id}:${createdAgentKey.api_key}`)}
        />
      )}
      {isFlyoutVisible && (
        <CreateAgentKeyFlyout
          onCancel={() => {
            setIsFlyoutVisible(false);
          }}
          onSuccess={(agentKey: CreateApiKeyResponse) => {
            setCreatedAgentKey(agentKey);
            setIsFlyoutVisible(false);
            refetchAgentKeys();
          }}
          onError={(keyName: string, message: string) => {
            toasts.addDanger(
              i18n.translate('xpack.apm.settings.agentKeys.crate.failed', {
                defaultMessage:
                  'Error creating APM agent key "{keyName}". Error: "{message}"',
                values: { keyName, message },
              })
            );
            setIsFlyoutVisible(false);
          }}
        />
      )}
      <AgentKeysContent
        loading={
          privilegesStatus === FETCH_STATUS.LOADING ||
          status === FETCH_STATUS.LOADING
        }
        requestFailed={
          privilegesStatus === FETCH_STATUS.FAILURE ||
          status === FETCH_STATUS.FAILURE
        }
        canManage={canManage}
        areApiKeysEnabled={areApiKeysEnabled}
        agentKeys={agentKeys}
        onKeyDelete={() => {
          setCreatedAgentKey(undefined);
          refetchAgentKeys();
        }}
        onCreateAgentClick={() => setIsFlyoutVisible(true)}
      />
    </Fragment>
  );
}

function AgentKeysContent({
  loading,
  requestFailed,
  canManage,
  areApiKeysEnabled,
  agentKeys,
  onKeyDelete,
  onCreateAgentClick,
}: {
  loading: boolean;
  requestFailed: boolean;
  canManage: boolean;
  areApiKeysEnabled: boolean;
  agentKeys?: ApiKey[];
  onKeyDelete: () => void;
  onCreateAgentClick: () => void;
}) {
  if (!agentKeys) {
    if (loading) {
      return (
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          titleSize="xs"
          title={
            <h2>
              {i18n.translate(
                'xpack.apm.settings.agentKeys.agentKeysLoadingPromptTitle',
                {
                  defaultMessage: 'Loading APM agent keys...',
                }
              )}
            </h2>
          }
        />
      );
    }

    if (requestFailed) {
      return (
        <EuiEmptyPrompt
          iconType="alert"
          title={
            <h2>
              {i18n.translate(
                'xpack.apm.settings.agentKeys.agentKeysErrorPromptTitle',
                {
                  defaultMessage: 'Could not load APM agent keys.',
                }
              )}
            </h2>
          }
        />
      );
    }

    if (!canManage) {
      return <PermissionDenied />;
    }

    if (!areApiKeysEnabled) {
      return <ApiKeysNotEnabled />;
    }
  }

  if (agentKeys && isEmpty(agentKeys)) {
    return (
      <EuiEmptyPrompt
        iconType="gear"
        title={
          <h2>
            {i18n.translate('xpack.apm.settings.agentKeys.emptyPromptTitle', {
              defaultMessage: 'Create your first key',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.apm.settings.agentKeys.emptyPromptBody', {
              defaultMessage:
                'Create APM agent keys to authorize APM agent requests to the APM Server.',
            })}
          </p>
        }
        actions={
          <EuiButton
            onClick={onCreateAgentClick}
            fill={true}
            iconType="plusInCircle"
          >
            {i18n.translate(
              'xpack.apm.settings.agentKeys.createAgentKeyButton',
              {
                defaultMessage: 'Create APM agent key',
              }
            )}
          </EuiButton>
        }
      />
    );
  }

  if (agentKeys && !isEmpty(agentKeys)) {
    return (
      <AgentKeysTable agentKeys={agentKeys ?? []} onKeyDelete={onKeyDelete} />
    );
  }

  return null;
}
