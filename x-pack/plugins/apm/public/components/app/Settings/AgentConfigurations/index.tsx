/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { callApmApi } from '../../../../services/rest/createCallApmApi';
import { useTrackPageview } from '../../../../../../observability/public';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { createAgentConfigurationHref } from '../../../shared/Links/apm/agentConfigurationLinks';
import { AgentConfigurationList } from './List';

const INITIAL_DATA = { configurations: [] };

async function enableFleetSync() {
  return await callApmApi({
    endpoint: 'POST /api/apm/settings/agent-configuration/fleet_sync',
    signal: null,
  });
}

export function AgentConfigurations() {
  const { refetch, data = INITIAL_DATA, status } = useFetcher(
    (callApmApi) =>
      callApmApi({ endpoint: 'GET /api/apm/settings/agent-configuration' }),
    [],
    { preservePreviousData: false, showToastOnError: false }
  );

  useTrackPageview({ app: 'apm', path: 'agent_configuration' });
  useTrackPageview({ app: 'apm', path: 'agent_configuration', delay: 15000 });

  const {
    data: packagePolicyInput,
    status: packagePolicyInputStatus,
    error: packagePolicyError,
    refetch: refetchPackagePolicyInput,
  } = useFetcher(
    (callApmApi) =>
      callApmApi({
        endpoint:
          'GET /api/apm/settings/agent-configuration/fleet-sync/package-policy-input',
      }),
    [],
    { preservePreviousData: false, showToastOnError: false }
  );

  const hasConfigurations = !isEmpty(data.configurations);

  const isFleetSyncLoading =
    packagePolicyInputStatus !== FETCH_STATUS.FAILURE &&
    packagePolicyInputStatus !== FETCH_STATUS.SUCCESS;
  const isFleetSyncUnavailable = packagePolicyError?.response?.status === 503;
  const isFleetSyncEnabled = Boolean(
    packagePolicyInputStatus === FETCH_STATUS.SUCCESS &&
      packagePolicyInput?.agent_config.value &&
      packagePolicyInput?.alert
  );

  const [isFleetSyncEnableLoading, setIsFleetSyncEnableLoading] = useState(
    false
  );

  return (
    <>
      <EuiTitle size="l">
        <h1>
          {i18n.translate('xpack.apm.agentConfig.titleText', {
            defaultMessage: 'Agent central configuration',
          })}
        </h1>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued">
        {i18n.translate('xpack.apm.settings.agentConfig.descriptionText', {
          defaultMessage: `Fine-tune your agent configuration from within the APM app. Changes are automatically propagated to your APM agents, so there’s no need to redeploy.`,
        })}
      </EuiText>
      <EuiSpacer size="l" />
      <EuiPanel>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>
                {i18n.translate(
                  'xpack.apm.agentConfig.configurationsPanel.title',
                  { defaultMessage: 'Configurations' }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {!isFleetSyncLoading && !isFleetSyncUnavailable && (
            <EuiFlexItem>
              <div>
                <EuiButton
                  disabled={isFleetSyncEnabled}
                  onClick={async () => {
                    setIsFleetSyncEnableLoading(true);
                    await enableFleetSync();
                    refetchPackagePolicyInput();
                    setIsFleetSyncEnableLoading(false);
                  }}
                  isLoading={isFleetSyncEnableLoading}
                >
                  {isFleetSyncEnabled
                    ? i18n.translate(
                        'xpack.apm.agentConfig.configurationsPanel.fleetSyncingEnabledLabel',
                        { defaultMessage: 'Syncing with fleet policy' }
                      )
                    : i18n.translate(
                        'xpack.apm.agentConfig.configurationsPanel.enableFleetSyncButtonLabel',
                        { defaultMessage: 'Sync with fleet policy' }
                      )}
                </EuiButton>
              </div>
            </EuiFlexItem>
          )}
          {hasConfigurations ? <CreateConfigurationButton /> : null}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <AgentConfigurationList
          status={status}
          configurations={data.configurations}
          refetch={refetch}
        />
      </EuiPanel>
    </>
  );
}

function CreateConfigurationButton() {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;
  const { search } = useLocation();
  const href = createAgentConfigurationHref(search, basePath);
  const canSave = core.application.capabilities.apm.save;
  return (
    <EuiFlexItem>
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={
              !canSave &&
              i18n.translate(
                'xpack.apm.agentConfig.configurationsPanel.title.noPermissionTooltipLabel',
                {
                  defaultMessage:
                    "Your user role doesn't have permissions to create agent configurations",
                }
              )
            }
          >
            <EuiButton
              color="primary"
              fill
              iconType="plusInCircle"
              href={href}
              isDisabled={!canSave}
            >
              {i18n.translate('xpack.apm.agentConfig.createConfigButtonLabel', {
                defaultMessage: 'Create configuration',
              })}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
