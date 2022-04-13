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
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React from 'react';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { AgentConfigurationList } from './list';

const INITIAL_DATA = { configurations: [] };

export function AgentConfigurations() {
  const {
    refetch,
    data = INITIAL_DATA,
    status,
  } = useFetcher(
    (callApmApi) => callApmApi('GET /api/apm/settings/agent-configuration'),
    [],
    { preservePreviousData: false, showToastOnError: false }
  );

  const hasConfigurations = !isEmpty(data.configurations);

  return (
    <>
      <EuiText color="subdued">
        {i18n.translate('xpack.apm.settings.agentConfig.descriptionText', {
          defaultMessage: `Fine-tune your agent configuration from within the APM app. Changes are automatically propagated to your APM agents, so there’s no need to redeploy.`,
        })}
      </EuiText>

      <EuiSpacer size="m" />

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

      <AgentConfigurationList
        status={status}
        configurations={data.configurations}
        refetch={refetch}
      />
    </>
  );
}

function CreateConfigurationButton() {
  const href = useApmRouter().link('/settings/agent-configuration/create');

  const { core } = useApmPluginContext();

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
