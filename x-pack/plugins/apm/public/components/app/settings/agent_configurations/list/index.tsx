/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiHealth,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React, { useState } from 'react';
import { useApmRouter } from '../../../../../hooks/use_apm_router';
import { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import { getOptionLabel } from '../../../../../../common/agent_configuration/all_option';
import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS } from '../../../../../hooks/use_fetcher';
import { useTheme } from '../../../../../hooks/use_theme';
import { LoadingStatePrompt } from '../../../../shared/loading_state_prompt';
import type { ITableColumn } from '../../../../shared/managed_table';
import { TimestampTooltip } from '../../../../shared/timestamp_tooltip';
import { ConfirmDeleteModal } from './confirm_delete_modal';
import { ManagedTableSyncUrl } from '../../../../shared/managed_table/managed_table_sync_url';

type Config =
  APIReturnType<'GET /api/apm/settings/agent-configuration'>['configurations'][0];

interface Props {
  status: FETCH_STATUS;
  configurations: Config[];
  refetch: () => void;
}

export function AgentConfigurationList({
  status,
  configurations,
  refetch,
}: Props) {
  const { core } = useApmPluginContext();
  const canSave = core.application.capabilities.apm.save;
  const theme = useTheme();
  const [configToBeDeleted, setConfigToBeDeleted] = useState<Config | null>(
    null
  );

  const apmRouter = useApmRouter();

  const createAgentConfigurationHref = apmRouter.link(
    '/settings/agent-configuration/create'
  );

  const emptyStatePrompt = (
    <EuiEmptyPrompt
      iconType="controlsHorizontal"
      title={
        <h2>
          {i18n.translate(
            'xpack.apm.agentConfig.configTable.emptyPromptTitle',
            { defaultMessage: 'No configurations found.' }
          )}
        </h2>
      }
      actions={
        <EuiToolTip
          content={
            !canSave &&
            i18n.translate(
              'xpack.apm.settings.agentConfig.createConfigButton.tooltip',
              {
                defaultMessage:
                  "You don't have permissions to create agent configurations",
              }
            )
          }
        >
          <EuiButton
            color="primary"
            fill
            href={createAgentConfigurationHref}
            isDisabled={!canSave}
          >
            {i18n.translate(
              'xpack.apm.agentConfig.configTable.createConfigButtonLabel',
              { defaultMessage: 'Create configuration' }
            )}
          </EuiButton>
        </EuiToolTip>
      }
    />
  );

  const failurePrompt = (
    <EuiEmptyPrompt
      iconType="alert"
      body={
        <>
          <p>
            {i18n.translate(
              'xpack.apm.agentConfig.configTable.configTable.failurePromptText',
              {
                defaultMessage:
                  'The list of agent configurations could not be fetched. Your user may not have the sufficient permissions.',
              }
            )}
          </p>
        </>
      }
    />
  );

  if (status === FETCH_STATUS.FAILURE) {
    return failurePrompt;
  }

  if (status === FETCH_STATUS.SUCCESS && isEmpty(configurations)) {
    return emptyStatePrompt;
  }

  const columns: Array<ITableColumn<Config>> = [
    {
      field: 'applied_by_agent',
      align: 'center',
      width: theme.eui.euiSizeXL,
      name: '',
      sortable: true,
      render: (_, { applied_by_agent: appliedByAgent }) => (
        <EuiToolTip
          content={
            appliedByAgent
              ? i18n.translate(
                  'xpack.apm.agentConfig.configTable.appliedTooltipMessage',
                  { defaultMessage: 'Applied by at least one agent' }
                )
              : i18n.translate(
                  'xpack.apm.agentConfig.configTable.notAppliedTooltipMessage',
                  { defaultMessage: 'Not yet applied by any agents' }
                )
          }
        >
          <EuiHealth
            color={appliedByAgent ? 'success' : theme.eui.euiColorLightShade}
          />
        </EuiToolTip>
      ),
    },
    {
      field: 'service.name',
      name: i18n.translate(
        'xpack.apm.agentConfig.configTable.serviceNameColumnLabel',
        { defaultMessage: 'Service name' }
      ),
      sortable: true,
      render: (_, config: Config) => (
        <EuiButtonEmpty
          flush="left"
          size="s"
          color="primary"
          href={apmRouter.link('/settings/agent-configuration/edit', {
            query: {
              name: config.service.name,
              environment: config.service.environment,
            },
          })}
        >
          {getOptionLabel(config.service.name)}
        </EuiButtonEmpty>
      ),
    },
    {
      field: 'service.environment',
      name: i18n.translate(
        'xpack.apm.agentConfig.configTable.environmentColumnLabel',
        { defaultMessage: 'Service environment' }
      ),
      sortable: true,
      render: (_, { service }) => getOptionLabel(service.environment),
    },
    {
      align: RIGHT_ALIGNMENT,
      field: '@timestamp',
      name: i18n.translate(
        'xpack.apm.agentConfig.configTable.lastUpdatedColumnLabel',
        { defaultMessage: 'Last updated' }
      ),
      sortable: true,
      render: (_, item) => (
        <TimestampTooltip time={item['@timestamp']} timeUnit="minutes" />
      ),
    },
    ...(canSave
      ? [
          {
            width: theme.eui.euiSizeXL,
            name: '',
            render: (config: Config) => (
              <EuiButtonIcon
                aria-label="Edit"
                iconType="pencil"
                href={apmRouter.link('/settings/agent-configuration/edit', {
                  query: {
                    name: config.service.name,
                    environment: config.service.environment,
                  },
                })}
              />
            ),
          },
          {
            width: theme.eui.euiSizeXL,
            name: '',
            render: (config: Config) => (
              <EuiButtonIcon
                aria-label="Delete"
                iconType="trash"
                onClick={() => setConfigToBeDeleted(config)}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {configToBeDeleted && (
        <ConfirmDeleteModal
          config={configToBeDeleted}
          onCancel={() => setConfigToBeDeleted(null)}
          onConfirm={() => {
            setConfigToBeDeleted(null);
            refetch();
          }}
        />
      )}

      <ManagedTableSyncUrl
        noItemsMessage={<LoadingStatePrompt />}
        columns={columns}
        items={configurations}
        // @ts-ignore
        initialSortField="service.name"
        initialSortDirection="asc"
      />
    </>
  );
}
