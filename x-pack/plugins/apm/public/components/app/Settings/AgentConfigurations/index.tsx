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
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTrackPageview } from '../../../../../../observability/public';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { createAgentConfigurationHref } from '../../../shared/Links/apm/agentConfigurationLinks';
import { AgentConfigurationList } from './List';

export function AgentConfigurations() {
  const { refetch, data = [], status } = useFetcher(
    (callApmApi) =>
      callApmApi({ endpoint: 'GET /api/apm/settings/agent-configuration' }),
    [],
    { preservePreviousData: false, showToastOnError: false }
  );

  useTrackPageview({ app: 'apm', path: 'agent_configuration' });
  useTrackPageview({ app: 'apm', path: 'agent_configuration', delay: 15000 });

  const hasConfigurations = !isEmpty(data);

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
                  'xpack.apm.agentConfig.configurationsPanelTitle',
                  { defaultMessage: 'Configurations' }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>

          {hasConfigurations ? <CreateConfigurationButton /> : null}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <AgentConfigurationList status={status} data={data} refetch={refetch} />
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
                'xpack.apm.agentConfig.configurationsPanelTitle.noPermissionTooltipLabel',
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
