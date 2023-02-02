/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import styled from 'styled-components';

import { useGetPackageInfoByKey, useKibanaLink, useLink } from '../../../../hooks';
import type { Agent, AgentPolicy } from '../../../../types';
import {
  FLEET_ELASTIC_AGENT_PACKAGE,
  FLEET_ELASTIC_AGENT_DETAILS_DASHBOARD_ID,
} from '../../../../../../../common/constants';

function useAgentDashboardLink(agent: Agent) {
  const { isLoading, data } = useGetPackageInfoByKey(FLEET_ELASTIC_AGENT_PACKAGE);

  const isInstalled = data?.item.status === 'installed';

  const dashboardLink = useKibanaLink(`/dashboard/${FLEET_ELASTIC_AGENT_DETAILS_DASHBOARD_ID}`);
  const query = `_a=(query:(language:kuery,query:'elastic_agent.id:${agent.id}'))`;
  const link = `${dashboardLink}?${query}`;

  return {
    isLoading,
    isInstalled,
    link,
  };
}

const EuiButtonCompressed = styled(EuiButton)`
  height: 32px;
`;

export const AgentDashboardLink: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
}> = ({ agent, agentPolicy }) => {
  const { isInstalled, link, isLoading } = useAgentDashboardLink(agent);
  const { getHref } = useLink();

  const isLogAndMetricsEnabled = agentPolicy?.monitoring_enabled?.length ?? 0 > 0;

  const buttonArgs =
    !isInstalled || isLoading || !isLogAndMetricsEnabled ? { disabled: true } : { href: link };

  const button = (
    <EuiButtonCompressed {...buttonArgs} isLoading={isLoading} color="primary">
      <FormattedMessage
        id="xpack.fleet.agentDetails.viewDashboardButtonLabel"
        defaultMessage="View more agent metrics"
      />
    </EuiButtonCompressed>
  );

  if (!isLoading && !isLogAndMetricsEnabled && agentPolicy) {
    return (
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.fleet.agentDetails.viewDashboardButton.disabledNoLogsAndMetricsTooltip"
            defaultMessage="Logs and metrics for agent are not enabled in the agent policy."
          />
        }
      >
        <EuiButtonCompressed
          isLoading={isLoading}
          color="primary"
          href={getHref('policy_details', { policyId: agentPolicy.id, tabId: 'settings' })}
        >
          <FormattedMessage
            id="xpack.fleet.agentDetails.enableLogsAndMetricsLabel"
            defaultMessage="Enable logs and metrics"
          />
        </EuiButtonCompressed>
      </EuiToolTip>
    );
  }

  if (!isInstalled) {
    return (
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.fleet.agentDetails.viewDashboardButton.disabledNoIntegrationTooltip"
            defaultMessage="Agent dashboard not found, you need to install the elastic_agent integration."
          />
        }
      >
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
