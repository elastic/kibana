/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLoadingContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import { ValuesType } from 'utility-types';
import { AgentExplorerFieldName } from '../../../../../../common/agent_explorer';
import {
  getServiceNodeName,
  SERVICE_NODE_NAME_MISSING,
} from '../../../../../../common/service_nodes';
import { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import { ServiceNodeMetricOverviewLink } from '../../../../shared/links/apm/service_node_metric_overview_link';
import { unit } from '../../../../../utils/style';
import { EnvironmentBadge } from '../../../../shared/environment_badge';
import { ItemsBadge } from '../../../../shared/item_badge';
import { TruncateWithTooltip } from '../../../../shared/truncate_with_tooltip';

type AgentExplorerInstance = ValuesType<
  APIReturnType<'GET /internal/apm/services/{serviceName}/agent_instances'>['items']
>;

enum AgentExplorerInstanceFieldName {
  InstanceName = 'serviceNode',
  Environments = 'environments',
  AgentName = 'agentName',
  AgentVersion = 'agentVersion',
  LastReport = 'lastReport',
}

export function getInstanceColumns(
  serviceName = ''
): Array<EuiBasicTableColumn<AgentExplorerInstance>> {
  return [
    {
      field: AgentExplorerInstanceFieldName.InstanceName,
      name: i18n.translate(
        'xpack.apm.agentExplorerInstanceTable.InstanceColumnLabel',
        {
          defaultMessage: 'Instance',
        }
      ),
      sortable: true,
      render: (_, { serviceNode }) => {
        const { displayedName, tooltip } =
          serviceNode === SERVICE_NODE_NAME_MISSING
            ? {
                displayedName: getServiceNodeName(serviceNode),
                tooltip: i18n.translate(
                  'xpack.apm.agentExplorerInstanceTable.explainServiceNodeNameMissing',
                  {
                    defaultMessage:
                      'We could not identify which JVMs these metrics belong to. This is likely caused by running a version of APM Server that is older than 7.5. Upgrading to APM Server 7.5 or higher should resolve this issue.',
                  }
                ),
              }
            : { displayedName: serviceNode, tooltip: serviceNode };

        return (
          <TruncateWithTooltip
            data-test-subj="apmAgentExplorerInstanceListServiceLink"
            text={tooltip}
            content={
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                responsive={false}
              >
                <EuiFlexItem className="eui-textTruncate">
                  <ServiceNodeMetricOverviewLink
                    serviceName={serviceName}
                    serviceNodeName={serviceNode}
                  >
                    <span className="eui-textTruncate">{displayedName}</span>
                  </ServiceNodeMetricOverviewLink>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        );
      },
    },
    {
      field: AgentExplorerInstanceFieldName.Environments,
      name: i18n.translate(
        'xpack.apm.agentExplorerInstanceTable.environmentColumnLabel',
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
      field: AgentExplorerInstanceFieldName.AgentVersion,
      name: i18n.translate(
        'xpack.apm.agentExplorerInstanceTable.agentVersionColumnLabel',
        { defaultMessage: 'Agent Version' }
      ),
      width: `${unit * 15}px`,
      sortable: true,
      render: (_, { agentVersion }) => (
        <ItemsBadge
          items={agentVersion ? [agentVersion] : []}
          multipleItemsMessage={i18n.translate(
            'xpack.apm.agentExplorerInstanceTable.agentVersionColumnLabel.multipleVersions',
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
      field: AgentExplorerInstanceFieldName.LastReport,
      name: i18n.translate(
        'xpack.apm.agentExplorerInstanceTable.lastReportColumnLabel',
        {
          defaultMessage: 'Last report',
        }
      ),
      width: `${unit * 15}px`,
      sortable: true,
      render: (_, { lastReport }) => (
        <>{moment(new Date(`${lastReport}`)).fromNow()}</>
      ),
    },
  ];
}

interface Props {
  serviceName?: string;
  items: AgentExplorerInstance[];
  isLoading: boolean;
}

export function AgentInstancesDetails({
  serviceName,
  items,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div style={{ width: '50%' }}>
        <EuiLoadingContent data-test-subj="loadingSpinner" />
      </div>
    );
  }

  return (
    <EuiInMemoryTable
      tableCaption={i18n.translate(
        'xpack.apm.agentExplorerInstanceTable.table.caption',
        {
          defaultMessage: 'Agent Explorer',
        }
      )}
      items={items}
      columns={getInstanceColumns(serviceName)}
      pagination={{
        pageSizeOptions: [25, 50, 100],
      }}
      sorting={{
        sort: {
          field: AgentExplorerFieldName.AgentVersion,
          direction: 'desc',
        },
      }}
      data-test-subj="agentExplorerTable"
      message={
        isLoading
          ? i18n.translate('xpack.apm.storageExplorer.table.loading', {
              defaultMessage: 'Loading...',
            })
          : i18n.translate('xpack.apm.storageExplorer.table.noResults', {
              defaultMessage: 'No data found',
            })
      }
    />
  );
}
