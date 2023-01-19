/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';

import type { Agent, AgentPolicy } from '../../../../../types';
import { useKibanaVersion } from '../../../../../hooks';
import {
  ExperimentalFeaturesService,
  formatBytes,
  isAgentUpgradeable,
} from '../../../../../services';
import { AgentPolicySummaryLine } from '../../../../../components';
import { AgentHealth, MetricNonAvailable } from '../../../components';
import { Tags } from '../../../components/tags';

// Allows child text to be truncated
const FlexItemWithMinWidth = styled(EuiFlexItem)`
  min-width: 0px;
`;

export const AgentDetailsOverviewSection: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
}> = memo(({ agent, agentPolicy }) => {
  const kibanaVersion = useKibanaVersion();
  const { displayAgentMetrics } = ExperimentalFeaturesService.get();

  return (
    <EuiPanel>
      <EuiDescriptionList compressed>
        <EuiFlexGroup direction="column" gutterSize="m">
          {[
            ...(displayAgentMetrics
              ? [
                  {
                    title: i18n.translate('xpack.fleet.agentDetails.cpuLabel', {
                      defaultMessage: 'CPU',
                    }),
                    description:
                      agent.metrics?.cpu_avg && agent.metrics?.cpu_avg !== 0 ? (
                        `${(agent.metrics.cpu_avg * 100).toFixed(2)} %`
                      ) : (
                        <MetricNonAvailable agentPolicy={agentPolicy} />
                      ),
                  },
                  {
                    title: i18n.translate('xpack.fleet.agentDetails.memoryLabel', {
                      defaultMessage: 'Memory',
                    }),
                    description: agent.metrics?.memory_size_byte_avg ? (
                      formatBytes(agent.metrics?.memory_size_byte_avg)
                    ) : (
                      <MetricNonAvailable agentPolicy={agentPolicy} />
                    ),
                  },
                ]
              : []),
            {
              title: i18n.translate('xpack.fleet.agentDetails.statusLabel', {
                defaultMessage: 'Status',
              }),
              description: <AgentHealth agent={agent} showOfflinePreviousStatus={true} />,
            },
            {
              title: i18n.translate('xpack.fleet.agentDetails.lastActivityLabel', {
                defaultMessage: 'Last activity',
              }),
              description: agent.last_checkin ? (
                <FormattedRelative value={new Date(agent.last_checkin)} />
              ) : (
                '-'
              ),
            },
            {
              title: i18n.translate('xpack.fleet.agentDetails.lastCheckinMessageLabel', {
                defaultMessage: 'Last checkin message',
              }),
              description: agent.last_checkin_message ? agent.last_checkin_message : '-',
            },
            {
              title: i18n.translate('xpack.fleet.agentDetails.hostIdLabel', {
                defaultMessage: 'Agent ID',
              }),
              description: agent.id,
            },
            {
              title: i18n.translate('xpack.fleet.agentDetails.agentPolicyLabel', {
                defaultMessage: 'Agent policy',
              }),
              description: agentPolicy ? (
                <AgentPolicySummaryLine policy={agentPolicy} agent={agent} />
              ) : (
                agent.policy_id || '-'
              ),
            },
            {
              title: i18n.translate('xpack.fleet.agentDetails.versionLabel', {
                defaultMessage: 'Agent version',
              }),
              description:
                typeof agent.local_metadata?.elastic?.agent?.version === 'string' ? (
                  <EuiFlexGroup gutterSize="s" alignItems="center" style={{ minWidth: 0 }}>
                    <EuiFlexItem grow={false} className="eui-textNoWrap">
                      {agent.local_metadata.elastic.agent.version}
                    </EuiFlexItem>
                    {isAgentUpgradeable(agent, kibanaVersion) ? (
                      <EuiFlexItem grow={false}>
                        <EuiToolTip
                          position="right"
                          content={i18n.translate('xpack.fleet.agentList.agentUpgradeLabel', {
                            defaultMessage: 'Upgrade available',
                          })}
                        >
                          <EuiIcon type="alert" color="warning" />
                        </EuiToolTip>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                ) : (
                  '-'
                ),
            },
            {
              title: i18n.translate('xpack.fleet.agentDetails.hostNameLabel', {
                defaultMessage: 'Host name',
              }),
              description:
                typeof agent.local_metadata?.host?.hostname === 'string'
                  ? agent.local_metadata.host.hostname
                  : '-',
            },
            {
              title: i18n.translate('xpack.fleet.agentDetails.logLevel', {
                defaultMessage: 'Logging level',
              }),
              description:
                typeof agent.local_metadata?.elastic?.agent?.log_level === 'string'
                  ? agent.local_metadata.elastic.agent.log_level
                  : '-',
            },
            {
              title: i18n.translate('xpack.fleet.agentDetails.releaseLabel', {
                defaultMessage: 'Agent release',
              }),
              description:
                typeof agent.local_metadata?.elastic?.agent?.snapshot === 'boolean'
                  ? agent.local_metadata.elastic.agent.snapshot === true
                    ? 'snapshot'
                    : 'stable'
                  : '-',
            },
            {
              title: i18n.translate('xpack.fleet.agentDetails.platformLabel', {
                defaultMessage: 'Platform',
              }),
              description:
                typeof agent.local_metadata?.os?.platform === 'string'
                  ? agent.local_metadata.os.platform
                  : '-',
            },
            {
              title: i18n.translate('xpack.fleet.agentDetails.monitorLogsLabel', {
                defaultMessage: 'Monitor logs',
              }),
              description:
                Array.isArray(agentPolicy?.monitoring_enabled) &&
                agentPolicy?.monitoring_enabled?.includes('logs') ? (
                  <FormattedMessage
                    id="xpack.fleet.agentList.monitorLogsEnabledText"
                    defaultMessage="Enabled"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.fleet.agentList.monitorLogsDisabledText"
                    defaultMessage="Disabled"
                  />
                ),
            },
            {
              title: i18n.translate('xpack.fleet.agentDetails.monitorMetricsLabel', {
                defaultMessage: 'Monitor metrics',
              }),
              description:
                Array.isArray(agentPolicy?.monitoring_enabled) &&
                agentPolicy?.monitoring_enabled?.includes('metrics') ? (
                  <FormattedMessage
                    id="xpack.fleet.agentList.monitorMetricsEnabledText"
                    defaultMessage="Enabled"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.fleet.agentList.monitorMetricsDisabledText"
                    defaultMessage="Disabled"
                  />
                ),
            },
            {
              title: i18n.translate('xpack.fleet.agentDetails.tagsLabel', {
                defaultMessage: 'Tags',
              }),
              description: (agent.tags ?? []).length > 0 ? <Tags tags={agent.tags ?? []} /> : '-',
            },
          ].map(({ title, description }) => {
            const tooltip =
              typeof description === 'string' && description.length > 20 ? description : '';
            return (
              <EuiFlexGroup>
                <FlexItemWithMinWidth grow={3}>
                  <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
                </FlexItemWithMinWidth>
                <FlexItemWithMinWidth grow={7}>
                  <EuiToolTip position="top" content={tooltip}>
                    <EuiDescriptionListDescription className="eui-textTruncate">
                      {description}
                    </EuiDescriptionListDescription>
                  </EuiToolTip>
                </FlexItemWithMinWidth>
              </EuiFlexGroup>
            );
          })}
        </EuiFlexGroup>
      </EuiDescriptionList>
    </EuiPanel>
  );
});
