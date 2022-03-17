/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiToolTip } from '@elastic/eui';

import { useGetPackageInfoByKey, useKibanaLink } from '../../../../hooks';
import type { Agent } from '../../../../types';
import {
  FLEET_ELASTIC_AGENT_PACKAGE,
  FLEET_ELASTIC_AGENT_DETAILS_DASHBOARD_ID,
} from '../../../../../../../common';

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

export const AgentDashboardLink: React.FunctionComponent<{
  agent: Agent;
}> = ({ agent }) => {
  const { isInstalled, link, isLoading } = useAgentDashboardLink(agent);

  const buttonArgs = !isInstalled || isLoading ? { disabled: true } : { href: link };

  const button = (
    <EuiButton fill {...buttonArgs} isLoading={isLoading}>
      <FormattedMessage
        id="xpack.fleet.agentDetails.viewDashboardButtonLabel"
        defaultMessage="View agent dashboard"
      />
    </EuiButton>
  );

  if (!isInstalled) {
    return (
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.fleet.agentDetails.viewDashboardButtonDisabledTooltip"
            defaultMessage="Agent dashboard not found, you need to install the elastic_agent package."
          />
        }
      >
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
