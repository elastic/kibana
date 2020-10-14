/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Agent, AgentPolicy } from '../../../../types';
import { useKibanaVersion, useLink } from '../../../../hooks';
import { AgentHealth } from '../../components';
import { isAgentUpgradeable } from '../../../../services';

export const AgentDetailsContent: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
}> = memo(({ agent, agentPolicy }) => {
  const { getHref } = useLink();
  const kibanaVersion = useKibanaVersion();
  return (
    <EuiDescriptionList>
      {[
        {
          title: i18n.translate('xpack.ingestManager.agentDetails.hostNameLabel', {
            defaultMessage: 'Host name',
          }),
          description:
            typeof agent.local_metadata.host === 'object' &&
            typeof agent.local_metadata.host.hostname === 'string'
              ? agent.local_metadata.host.hostname
              : '-',
        },
        {
          title: i18n.translate('xpack.ingestManager.agentDetails.hostIdLabel', {
            defaultMessage: 'Agent ID',
          }),
          description: agent.id,
        },
        {
          title: i18n.translate('xpack.ingestManager.agentDetails.statusLabel', {
            defaultMessage: 'Status',
          }),
          description: <AgentHealth agent={agent} />,
        },
        {
          title: i18n.translate('xpack.ingestManager.agentDetails.agentPolicyLabel', {
            defaultMessage: 'Agent policy',
          }),
          description: agentPolicy ? (
            <EuiLink
              href={getHref('policy_details', { policyId: agent.policy_id! })}
              className="eui-textBreakWord"
            >
              {agentPolicy.name || agent.policy_id}
            </EuiLink>
          ) : (
            agent.policy_id || '-'
          ),
        },
        {
          title: i18n.translate('xpack.ingestManager.agentDetails.versionLabel', {
            defaultMessage: 'Agent version',
          }),
          description:
            typeof agent.local_metadata.elastic === 'object' &&
            typeof agent.local_metadata.elastic.agent === 'object' &&
            typeof agent.local_metadata.elastic.agent.version === 'string' ? (
              <EuiFlexGroup gutterSize="s" alignItems="center" style={{ minWidth: 0 }}>
                <EuiFlexItem grow={false} className="eui-textNoWrap">
                  {agent.local_metadata.elastic.agent.version}
                </EuiFlexItem>
                {isAgentUpgradeable(agent, kibanaVersion) ? (
                  <EuiFlexItem grow={false}>
                    <EuiText color="subdued" size="s" className="eui-textNoWrap">
                      <EuiIcon size="m" type="alert" color="warning" />
                      &nbsp;
                      <FormattedMessage
                        id="xpack.ingestManager.agentList.agentUpgradeLabel"
                        defaultMessage="Upgrade available"
                      />
                    </EuiText>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            ) : (
              '-'
            ),
        },
        {
          title: i18n.translate('xpack.ingestManager.agentDetails.releaseLabel', {
            defaultMessage: 'Agent release',
          }),
          description:
            typeof agent.local_metadata.elastic === 'object' &&
            typeof agent.local_metadata.elastic.agent === 'object' &&
            typeof agent.local_metadata.elastic.agent.snapshot === 'boolean'
              ? agent.local_metadata.elastic.agent.snapshot === true
                ? 'snapshot'
                : 'stable'
              : '-',
        },
        {
          title: i18n.translate('xpack.ingestManager.agentDetails.platformLabel', {
            defaultMessage: 'Platform',
          }),
          description:
            typeof agent.local_metadata.os === 'object' &&
            typeof agent.local_metadata.os.platform === 'string'
              ? agent.local_metadata.os.platform
              : '-',
        },
      ].map(({ title, description }) => {
        return (
          <EuiFlexGroup>
            <EuiFlexItem grow={3}>
              <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={7}>
              <EuiDescriptionListDescription>{description}</EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}
    </EuiDescriptionList>
  );
});
