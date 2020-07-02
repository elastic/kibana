/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiEmptyPrompt,
  EuiButton,
  EuiButtonEmpty,
  EuiHealth,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { useTheme } from '../../../../../hooks/useTheme';
import { FETCH_STATUS } from '../../../../../hooks/useFetcher';
import { ITableColumn, ManagedTable } from '../../../../shared/ManagedTable';
import { LoadingStatePrompt } from '../../../../shared/LoadingStatePrompt';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AgentConfigurationListAPIResponse } from '../../../../../../server/lib/settings/agent_configuration/list_configurations';
import { TimestampTooltip } from '../../../../shared/TimestampTooltip';
import { px, units } from '../../../../../style/variables';
import { getOptionLabel } from '../../../../../../common/agent_configuration/all_option';
import {
  createAgentConfigurationHref,
  editAgentConfigurationHref,
} from '../../../../shared/Links/apm/agentConfigurationLinks';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

type Config = AgentConfigurationListAPIResponse[0];

interface Props {
  status: FETCH_STATUS;
  data: Config[];
  refetch: () => void;
}

export const AgentConfigurationList = ({ status, data, refetch }: Props) => {
  const theme = useTheme();
  const [configToBeDeleted, setConfigToBeDeleted] = useState<Config | null>(
    null
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
      body={
        <>
          <p>
            {i18n.translate(
              'xpack.apm.agentConfig.configTable.emptyPromptText',
              {
                defaultMessage:
                  "Let's change that! You can fine-tune agent configuration directly from Kibana without having to redeploy. Get started by creating your first configuration.",
              }
            )}
          </p>
        </>
      }
      actions={
        <EuiButton color="primary" fill href={createAgentConfigurationHref()}>
          {i18n.translate(
            'xpack.apm.agentConfig.configTable.createConfigButtonLabel',
            { defaultMessage: 'Create configuration' }
          )}
        </EuiButton>
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

  if (status === FETCH_STATUS.SUCCESS && isEmpty(data)) {
    return emptyStatePrompt;
  }

  const columns: Array<ITableColumn<Config>> = [
    {
      field: 'applied_by_agent',
      align: 'center',
      width: px(units.double),
      name: '',
      sortable: true,
      render: (isApplied: boolean) => (
        <EuiToolTip
          content={
            isApplied
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
            color={isApplied ? 'success' : theme.eui.euiColorLightShade}
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
          href={editAgentConfigurationHref(config.service)}
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
      render: (environment: string) => getOptionLabel(environment),
    },
    {
      align: 'right',
      field: '@timestamp',
      name: i18n.translate(
        'xpack.apm.agentConfig.configTable.lastUpdatedColumnLabel',
        { defaultMessage: 'Last updated' }
      ),
      sortable: true,
      render: (value: number) => (
        <TimestampTooltip time={value} timeUnit="minutes" />
      ),
    },
    {
      width: px(units.double),
      name: '',
      render: (config: Config) => (
        <EuiButtonIcon
          aria-label="Edit"
          iconType="pencil"
          href={editAgentConfigurationHref(config.service)}
        />
      ),
    },
    {
      width: px(units.double),
      name: '',
      render: (config: Config) => (
        <EuiButtonIcon
          aria-label="Delete"
          iconType="trash"
          onClick={() => setConfigToBeDeleted(config)}
        />
      ),
    },
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

      <ManagedTable
        noItemsMessage={<LoadingStatePrompt />}
        columns={columns}
        items={data}
        initialSortField="service.name"
        initialSortDirection="asc"
        initialPageSize={20}
      />
    </>
  );
};
