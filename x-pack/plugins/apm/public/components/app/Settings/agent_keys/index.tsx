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
      return callApmApi({
        endpoint: 'GET /internal/apm/agent_keys/privileges',
      });
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
        return callApmApi({
          endpoint: 'GET /internal/apm/agent_keys',
        });
      }
    },
    [areApiKeysEnabled, canManage],
    { showToastOnError: false }
  );

  const agentKeys = data?.agentKeys;
  const isLoading =
    privilegesStatus === FETCH_STATUS.LOADING ||
    status === FETCH_STATUS.LOADING;

  const requestFailed =
    privilegesStatus === FETCH_STATUS.FAILURE ||
    status === FETCH_STATUS.FAILURE;

  let content = null;

  if (!agentKeys) {
    if (isLoading) {
      content = (
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          titleSize="xs"
          title={
            <h2>
              {i18n.translate(
                'xpack.apm.settings.agentKeys.agentKeysLoadingPromptTitle',
                {
                  defaultMessage: 'Loading Agent keys...',
                }
              )}
            </h2>
          }
        />
      );
    } else if (requestFailed) {
      content = (
        <EuiEmptyPrompt
          iconType="alert"
          title={
            <h2>
              {i18n.translate(
                'xpack.apm.settings.agentKeys.agentKeysErrorPromptTitle',
                {
                  defaultMessage: 'Could not load agent keys.',
                }
              )}
            </h2>
          }
        />
      );
    } else if (!canManage) {
      content = <PermissionDenied />;
    } else if (!areApiKeysEnabled) {
      content = <ApiKeysNotEnabled />;
    }
  } else {
    if (isEmpty(agentKeys)) {
      content = (
        <EuiEmptyPrompt
          iconType="gear"
          title={
            <h2>
              {i18n.translate('xpack.apm.settings.agentKeys.emptyPromptTitle', {
                defaultMessage: 'Create your first agent key',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.apm.settings.agentKeys.emptyPromptBody', {
                defaultMessage:
                  'Create agent keys to authorize requests to the APM Server.',
              })}
            </p>
          }
          actions={
            <EuiButton fill={true} iconType="plusInCircleFilled">
              {i18n.translate(
                'xpack.apm.settings.agentKeys.createAgentKeyButton',
                {
                  defaultMessage: 'Create agent key',
                }
              )}
            </EuiButton>
          }
        />
      );
    } else {
      content = (
        <AgentKeysTable
          agentKeys={agentKeys ?? []}
          refetchAgentKeys={refetchAgentKeys}
        />
      );
    }
  }

  return (
    <Fragment>
      <EuiText color="subdued">
        {i18n.translate('xpack.apm.settings.agentKeys.descriptionText', {
          defaultMessage:
            'View and delete agent keys. An agent key sends requests on behalf of a user.',
        })}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>
              {i18n.translate('xpack.apm.settings.agentKeys.title', {
                defaultMessage: 'Agent keys',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        {areApiKeysEnabled && canManage && (
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => setIsFlyoutVisible(true)}
              fill={true}
              iconType="plusInCircleFilled"
            >
              {i18n.translate(
                'xpack.apm.settings.agentKeys.createAgentKeyButton',
                {
                  defaultMessage: 'Create agent key',
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
          onError={(keyName: string) => {
            toasts.addDanger(
              i18n.translate('xpack.apm.settings.agentKeys.crate.failed', {
                defaultMessage: 'Error creating agent key "{keyName}"',
                values: { keyName },
              })
            );
            setIsFlyoutVisible(false);
          }}
        />
      )}
      {content}
    </Fragment>
  );
}
