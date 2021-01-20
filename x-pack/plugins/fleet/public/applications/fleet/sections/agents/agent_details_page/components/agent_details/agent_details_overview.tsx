/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { FormattedMessage } from '@kbn/i18n/react';
import { Agent, AgentPolicy } from '../../../../../types';
import { useKibanaVersion, useLink } from '../../../../../hooks';
import { isAgentUpgradeable } from '../../../../../services';
import { AgentPolicyPackageBadges } from '../../../components/agent_policy_package_badges';
import { LinkAndRevision } from '../../../../../components';

// Allows child text to be truncated
const FlexItemWithMinWidth = styled(EuiFlexItem)`
  min-width: 0px;
`;

export const AgentDetailsOverviewSection: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
}> = memo(({ agent, agentPolicy }) => {
  const { getHref } = useLink();
  const kibanaVersion = useKibanaVersion();
  return (
    <EuiPanel>
      <EuiDescriptionList compressed>
        {[
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
              <LinkAndRevision
                href={getHref('policy_details', { policyId: agentPolicy.id })}
                title={agentPolicy.name || agent.policy_id}
                revision={agentPolicy.revision}
              >
                {agentPolicy.name || agentPolicy.id}
              </LinkAndRevision>
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
            title: i18n.translate('xpack.fleet.agentDetails.integrationsLabel', {
              defaultMessage: 'Integrations',
            }),
            description: agent.policy_id ? (
              <AgentPolicyPackageBadges agentPolicyId={agent.policy_id} hideTitle />
            ) : null,
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
            description: agentPolicy?.monitoring_enabled?.includes('logs') ? (
              <FormattedMessage
                id="xpack.fleet.agentList.monitorLogsEnabledText"
                defaultMessage="True"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.agentList.monitorLogsDisabledText"
                defaultMessage="False"
              />
            ),
          },
          {
            title: i18n.translate('xpack.fleet.agentDetails.monitorMetricsLabel', {
              defaultMessage: 'Monitor metrics',
            }),
            description: agentPolicy?.monitoring_enabled?.includes('metrics') ? (
              <FormattedMessage
                id="xpack.fleet.agentList.monitorMetricsEnabledText"
                defaultMessage="True"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.agentList.monitorMetricsDisabledText"
                defaultMessage="False"
              />
            ),
          },
        ].map(({ title, description }) => {
          return (
            <EuiFlexGroup>
              <FlexItemWithMinWidth grow={3}>
                <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
              </FlexItemWithMinWidth>
              <FlexItemWithMinWidth grow={7}>
                <EuiDescriptionListDescription>{description}</EuiDescriptionListDescription>
              </FlexItemWithMinWidth>
            </EuiFlexGroup>
          );
        })}
      </EuiDescriptionList>
    </EuiPanel>
  );
});
