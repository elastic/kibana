/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Fragment } from 'react';
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

const INITIAL_DATA = {
  areApiKeysEnabled: false,
  canManage: false,
};

export function AgentKeys() {
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
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <AgentKeysContent />
    </Fragment>
  );
}

function AgentKeysContent() {
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
      if (areApiKeysEnabled || canManage) {
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

  if (!agentKeys) {
    if (isLoading) {
      return (
        <EuiEmptyPrompt
          color="subdued"
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
    }

    if (requestFailed) {
      return (
        <EuiEmptyPrompt
          iconType="alert"
          color="danger"
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
  }

  if (agentKeys && !isEmpty(agentKeys)) {
    return (
      <AgentKeysTable
        agentKeys={agentKeys ?? []}
        refetchAgentKeys={refetchAgentKeys}
      />
    );
  }

  return null;
}
