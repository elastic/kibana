/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { ValuesType } from 'utility-types';
import { AgentExplorerFieldName } from '../../../../../../common/agent_explorer';
import { NOT_AVAILABLE_LABEL } from '../../../../../../common/i18n';
import { AgentName } from '../../../../../../typings/es_schemas/ui/fields/agent';
import { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import { unit } from '../../../../../utils/style';
import { AgentIcon } from '../../../../shared/agent_icon';
import { EnvironmentBadge } from '../../../../shared/environment_badge';
import { ItemsBadge } from '../../../../shared/item_badge';
import { TruncateWithTooltip } from '../../../../shared/truncate_with_tooltip';
import { AgentExplorerDocsLink } from '../agent_explorer_docs_link';
import { AgentInstances } from '../agent_instances';

export type AgentExplorerItem = ValuesType<
  APIReturnType<'GET /internal/apm/get_agents_per_service'>['items']
>;

function formatString(value?: string | null) {
  return value || NOT_AVAILABLE_LABEL;
}

export function getAgentsColumns({
  selectedAgent,
  onAgentSelected,
}: {
  selectedAgent?: AgentExplorerItem;
  onAgentSelected: (agent: AgentExplorerItem) => void;
}): Array<EuiBasicTableColumn<AgentExplorerItem>> {
  return [
    {
      field: AgentExplorerFieldName.ServiceName,
      name: '',
      width: `${unit * 3}px`,
      render: (_, agent) => {
        const isSelected = selectedAgent === agent;

        return (
          <EuiToolTip
            content={i18n.translate(
              'xpack.apm.agentExplorerTable.viewAgentInstances',
              {
                defaultMessage: 'Toggle agent instances view',
              }
            )}
            delay="long"
          >
            <EuiButtonIcon
              size="xs"
              iconSize="s"
              aria-label="Toggle agent instances view"
              data-test-subj="apmAgentExplorerListToggle"
              onClick={() => onAgentSelected(agent)}
              display={isSelected ? 'base' : 'empty'}
              iconType={isSelected ? 'minimize' : 'expand'}
              isSelected={isSelected}
            />
          </EuiToolTip>
        );
      },
    },
    {
      field: AgentExplorerFieldName.ServiceName,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.serviceNameColumnLabel',
        {
          defaultMessage: 'Service Name',
        }
      ),
      sortable: true,
      render: (_, { serviceName, agentName }) => (
        <TruncateWithTooltip
          data-test-subj="apmAgentExplorerListServiceLink"
          text={formatString(serviceName)}
          content={
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <AgentIcon agentName={agentName} />
              </EuiFlexItem>
              <EuiFlexItem className="eui-textTruncate">
                <span className="eui-textTruncate">{serviceName}</span>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      ),
    },
    {
      field: AgentExplorerFieldName.Environments,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.environmentColumnLabel',
        {
          defaultMessage: 'Environment',
        }
      ),
      width: `${unit * 15}px`,
      sortable: true,
      render: (_, { environments }) => (
        <EnvironmentBadge environments={environments ?? []} />
      ),
    },
    {
      field: AgentExplorerFieldName.Instances,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.instancesColumnLabel',
        {
          defaultMessage: 'Instances',
        }
      ),
      width: `${unit * 10}px`,
      sortable: true,
    },
    {
      field: AgentExplorerFieldName.AgentName,
      width: `${unit * 10}px`,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.agentNameColumnLabel',
        { defaultMessage: 'Agent Name' }
      ),
      sortable: true,
    },
    {
      field: AgentExplorerFieldName.AgentVersion,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.agentVersionColumnLabel',
        { defaultMessage: 'Agent Version' }
      ),
      width: `${unit * 10}px`,
      render: (_, { agentVersion }) => (
        <ItemsBadge
          items={agentVersion ?? []}
          multipleItemsMessage={i18n.translate(
            'xpack.apm.agentExplorerTable.agentVersionColumnLabel.multipleVersions',
            {
              values: { versionsCount: agentVersion.length },
              defaultMessage:
                '{versionsCount, plural, one {1 version} other {# versions}}',
            }
          )}
        />
      ),
    },
    {
      field: AgentExplorerFieldName.AgentDocsPageUrl,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.agentDocsColumnLabel',
        { defaultMessage: 'Agent Docs' }
      ),
      width: `${unit * 10}px`,
      render: (_, { agentName, agentDocsPageUrl }) => (
        <EuiToolTip content={formatString(`${agentName} agent docs`)}>
          <AgentExplorerDocsLink
            agentName={agentName as AgentName}
            repositoryUrl={agentDocsPageUrl}
          />
        </EuiToolTip>
      ),
    },
  ];
}

interface Props {
  items: AgentExplorerItem[];
  noItemsMessage?: React.ReactNode;
  isLoading: boolean;
}

export function AgentList({ items, noItemsMessage, isLoading }: Props) {
  const [selectedAgent, setSelectedAgent] = useState<AgentExplorerItem>();
  const [showFlyout, setShowFlyout] = useState(false);

  useEffect(() => {
    setShowFlyout(!!selectedAgent);
  }, [selectedAgent]);

  const onAgentSelected = (agent: AgentExplorerItem) => {
    setSelectedAgent(agent);
  };

  const onCloseFlyout = () => {
    setShowFlyout(false);
    setSelectedAgent(undefined);
  };

  const agentColumns = useMemo(
    () => getAgentsColumns({ selectedAgent, onAgentSelected }),
    [selectedAgent]
  );

  return (
    <>
      {showFlyout && (
        <AgentInstances agent={selectedAgent} onClose={onCloseFlyout} />
      )}
      <EuiInMemoryTable
        tableCaption={i18n.translate('xpack.apm.agentExplorer.table.caption', {
          defaultMessage: 'Agent Explorer',
        })}
        items={items}
        columns={agentColumns}
        pagination={{
          pageSizeOptions: [25, 50, 100],
        }}
        sorting={{
          sort: {
            field: AgentExplorerFieldName.Instances,
            direction: 'desc',
          },
        }}
        loading={isLoading}
        data-test-subj="agentExplorerTable"
        message={
          isLoading
            ? i18n.translate('xpack.apm.agentExplorer.table.loading', {
                defaultMessage: 'Loading...',
              })
            : noItemsMessage
        }
      />
    </>
  );
}
