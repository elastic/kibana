/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, EuiLoadingContent } from '@elastic/eui';
import { AgentExplorerDetailsFieldName, AgentExplorerDetailsListItem, AgentExplorerFieldName, AgentExplorerListItem } from '@kbn/apm-plugin/common/agent_explorer';
import { useApmParams } from '@kbn/apm-plugin/public/hooks/use_apm_params';
import { useProgressiveFetcher } from '@kbn/apm-plugin/public/hooks/use_progressive_fetcher';
import { useTimeRange } from '@kbn/apm-plugin/public/hooks/use_time_range';
import { truncate, unit } from '@kbn/apm-plugin/public/utils/style';
import { i18n } from '@kbn/i18n';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { FETCH_STATUS } from '@kbn/observability-plugin/public';
import { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import { ApmRoutes } from '../../routing/apm_route_config';
import { EnvironmentBadge } from '../../shared/environment_badge';
import { ItemsBadge } from '../../shared/item_badge';
import { TruncateWithTooltip } from '../../shared/truncate_with_tooltip';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import { ServiceNodeMetricOverviewLink } from '../../shared/links/apm/service_node_metric_overview_link';
import { getServiceNodeName, SERVICE_NODE_NAME_MISSING } from '@kbn/apm-plugin/common/service_nodes';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import moment from 'moment';

interface Props {
  serviceName: string;
}

const ServiceNodeName = euiStyled.div`
  ${truncate(8 * unit)}
`;

function formatString(value?: string | null) {
  return value || NOT_AVAILABLE_LABEL;
}

export function getAgentsColumns({
  query,
  serviceName,
  start,
  end,
}: {
  query: TypeOf<ApmRoutes, '/agent-explorer'>['query'];
  serviceName: string;
  start: string;
  end: string;
}): Array<EuiBasicTableColumn<AgentExplorerDetailsListItem>> {
  return [
    {
      field: AgentExplorerDetailsFieldName.InstanceName,
      name: i18n.translate('xpack.apm.agentExplorerTable.serviceNameColumnLabel', {
        defaultMessage: 'Instance',
      }),
      sortable: true,
      render: (_, { instanceName }) => {
        const { displayedName, tooltip } =
          instanceName === SERVICE_NODE_NAME_MISSING
            ? {
                displayedName: getServiceNodeName(instanceName),
                tooltip: i18n.translate(
                  'xpack.apm.jvmsTable.explainServiceNodeNameMissing',
                  {
                    defaultMessage:
                      'We could not identify which JVMs these metrics belong to. This is likely caused by running a version of APM Server that is older than 7.5. Upgrading to APM Server 7.5 or higher should resolve this issue.',
                  }
                ),
              }
            : { displayedName: instanceName, tooltip: instanceName };

        return (
        <TruncateWithTooltip
          data-test-subj="apmAgentExplorerListServiceLink"
          text={tooltip}
          content={
            <ServiceNodeMetricOverviewLink
              serviceName={serviceName}
              serviceNodeName={instanceName}
              query={{rangeFrom:'now-24h', rangeTo: 'now'}}
            >
              <ServiceNodeName>{displayedName}</ServiceNodeName>
            </ServiceNodeMetricOverviewLink>
          }
        />
      )},
    },
    {
      field: AgentExplorerDetailsFieldName.Environments,
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
      field: AgentExplorerDetailsFieldName.Version,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.agentVersionColumnLabel',
        { defaultMessage: 'Agent Version' }
      ),
      sortable: true,
      render: (_, { version }) => (
        <ItemsBadge
          items={version ? [version] : []}
          multipleItemsMessage={i18n.translate(
            'xpack.apm.agentExplorerTable.agentVersionColumnLabel.multipleVersions',
            { 
              values: { versionsCount: version.length },
              defaultMessage: '{versionsCount, plural, one {1 version} other {# versions}}',
            }
          )}
        />
      ),
    },
    {
      field: AgentExplorerDetailsFieldName.lastReport,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.environmentColumnLabel',
        {
          defaultMessage: 'Last report',
        }
      ),
      width: `${unit * 15}px`,
      sortable: true,
      render: (_, { lastReport }) => (
        <>
          {moment(lastReport).fromNow()}
        </>
      ),
    },
  ];
}

export function AgentInstances({
  serviceName,
}: Props) {
  const { query } = useApmParams('/agent-explorer');
  const {
    environment,
    kuery,
  } = query;

  const { start, end } = useTimeRange({ rangeFrom: 'now-24h', rangeTo: 'now' });

  const { data, status } = useProgressiveFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/agent_explorer/{serviceName}/agent_instance_details',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              start,
              end,
              kuery,
            },
          },
        }
      );
    },
    [start, end, environment, kuery, serviceName]
  );

  if (
    status === FETCH_STATUS.LOADING ||
    status === FETCH_STATUS.NOT_INITIATED
  ) {
    return (
      <div style={{ width: '50%' }}>
        <EuiLoadingContent data-test-subj="loadingSpinner" />
      </div>
    );
  }

  const agents = (data?.items ?? [])
		.map((agent) => ({
			environments: agent.environments,
			instanceName: agent.agentId,
			version: agent.agentVersion,
			lastReport: new Date(`${agent.lastReport}`),
		}));

  return (
    <EuiFlexGroup gutterSize="xs" direction="column" responsive={false}>
      <EuiFlexItem>
        <EuiInMemoryTable
          tableCaption={i18n.translate('xpack.apm.agentExplorer.table.caption', {
            defaultMessage: 'Agent Explorer',
          })}
          items={agents}
          columns={getAgentsColumns({ query, serviceName, start, end })}
          pagination={false}
          sorting={{ sort: {
              field: AgentExplorerFieldName.AgentVersion,
              direction: 'desc'
            }
          }}
          data-test-subj="agentExplorerTable"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
