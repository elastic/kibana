/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTableColumn,
  EuiInMemoryTable,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { ValuesType } from 'utility-types';
import { MetricOverviewLink } from '../../../../../shared/links/apm/metric_overview_link';
import { AgentExplorerFieldName } from '../../../../../../../common/agent_explorer';
import { isOpenTelemetryAgentName } from '../../../../../../../common/agent_name';
import {
  getServiceNodeName,
  SERVICE_NODE_NAME_MISSING,
} from '../../../../../../../common/service_nodes';
import { AgentName } from '../../../../../../../typings/es_schemas/ui/fields/agent';
import { APIReturnType } from '../../../../../../services/rest/create_call_apm_api';
import { unit } from '../../../../../../utils/style';
import { EnvironmentBadge } from '../../../../../shared/environment_badge';
import { ItemsBadge } from '../../../../../shared/item_badge';
import { PopoverTooltip } from '../../../../../shared/popover_tooltip';
import { TimestampTooltip } from '../../../../../shared/timestamp_tooltip';
import { TruncateWithTooltip } from '../../../../../shared/truncate_with_tooltip';

type AgentExplorerInstance = ValuesType<
  APIReturnType<'GET /internal/apm/services/{serviceName}/agent_instances'>['items']
>;

enum AgentExplorerInstanceFieldName {
  InstanceName = 'serviceNode',
  Environments = 'environments',
  AgentVersion = 'agentVersion',
  LastReport = 'lastReport',
}

export function getInstanceColumns(
  serviceName: string,
  agentName: AgentName,
  agentDocsPageUrl?: string
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
        const displayedName = getServiceNodeName(serviceNode);

        return serviceNode === SERVICE_NODE_NAME_MISSING ? (
          <>
            {displayedName}
            <PopoverTooltip
              ariaLabel={i18n.translate(
                'xpack.apm.agentExplorerInstanceTable.noServiceNodeName.tooltip',
                {
                  defaultMessage: 'Tooltip for missing serviceNodeName',
                }
              )}
            >
              <EuiText style={{ width: `${unit * 24}px` }} size="s">
                <p>
                  <FormattedMessage
                    defaultMessage="You can configure the service node name through {seeDocs}."
                    id="xpack.apm.agentExplorerInstanceTable.noServiceNodeName.tooltip.linkToDocs"
                    values={{
                      seeDocs: (
                        <EuiLink
                          data-test-subj="apmGetInstanceColumnsConfigurationOptionsLink"
                          href={`${agentDocsPageUrl}${
                            !isOpenTelemetryAgentName(agentName)
                              ? 'configuration.html#service-node-name'
                              : ''
                          }`}
                          target="_blank"
                        >
                          {i18n.translate(
                            'xpack.apm.agentExplorerInstanceTable.noServiceNodeName.configurationOptions',
                            {
                              defaultMessage: 'configuration options',
                            }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </PopoverTooltip>
          </>
        ) : (
          <TruncateWithTooltip
            data-test-subj="apmAgentExplorerInstanceListServiceLink"
            text={displayedName}
            content={
              <>
                {serviceNode ? (
                  <MetricOverviewLink
                    serviceName={serviceName}
                    mergeQuery={(query) => ({
                      ...query,
                      kuery: `service.node.name:"${displayedName}"`,
                    })}
                  >
                    {displayedName}
                  </MetricOverviewLink>
                ) : (
                  <span className="eui-textTruncate">{displayedName}</span>
                )}
              </>
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
      width: `${unit * 16}px`,
      sortable: true,
      render: (_, { environments }) => (
        <EnvironmentBadge environments={environments} />
      ),
    },
    {
      field: AgentExplorerInstanceFieldName.AgentVersion,
      name: i18n.translate(
        'xpack.apm.agentExplorerInstanceTable.agentVersionColumnLabel',
        { defaultMessage: 'Agent Version' }
      ),
      width: `${unit * 16}px`,
      sortable: true,
      render: (_, { agentVersion }) => {
        const versions = [agentVersion];
        return (
          <ItemsBadge
            items={versions}
            multipleItemsMessage={i18n.translate(
              'xpack.apm.agentExplorerInstanceTable.agentVersionColumnLabel.multipleVersions',
              {
                values: { versionsCount: versions.length },
                defaultMessage:
                  '{versionsCount, plural, one {1 version} other {# versions}}',
              }
            )}
          />
        );
      },
    },
    {
      field: AgentExplorerInstanceFieldName.LastReport,
      name: i18n.translate(
        'xpack.apm.agentExplorerInstanceTable.lastReportColumnLabel',
        {
          defaultMessage: 'Last report',
        }
      ),
      width: `${unit * 16}px`,
      sortable: true,
      render: (_, { lastReport }) => <TimestampTooltip time={lastReport} />,
    },
  ];
}

interface Props {
  serviceName: string;
  agentName: AgentName;
  agentDocsPageUrl?: string;
  items: AgentExplorerInstance[];
  isLoading: boolean;
}

export function AgentInstancesDetails({
  serviceName,
  agentName,
  agentDocsPageUrl,
  items,
  isLoading,
}: Props) {
  return (
    <>
      <EuiInMemoryTable
        items={items}
        columns={getInstanceColumns(serviceName, agentName, agentDocsPageUrl)}
        pagination={true}
        sorting={{
          sort: {
            field: AgentExplorerFieldName.AgentVersion,
            direction: 'desc',
          },
        }}
        message={
          isLoading
            ? i18n.translate('xpack.apm.agentInstanceDetails.table.loading', {
                defaultMessage: 'Loading...',
              })
            : i18n.translate('xpack.apm.agentInstanceDetails.table.noResults', {
                defaultMessage: 'No data found',
              })
        }
      />
    </>
  );
}
