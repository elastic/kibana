/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo } from 'react';
import styled from 'styled-components';

import type { Agent, AgentPolicy } from '../../../../../types';

import { AgentDetailsIntegrations } from './agent_details_integrations';
import { AgentDetailsOverviewSection } from './agent_details_overview';

// Allows child text to be truncated
const FlexItemWithMinWidth = styled(EuiFlexItem)`
  min-width: 0px;
`;

export const AgentDetailsContent: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
}> = memo(({ agent, agentPolicy }) => {
  return (
    <>
      <EuiFlexGroup alignItems="flexStart">
        <FlexItemWithMinWidth>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.fleet.agentDetails.overviewSectionTitle"
                defaultMessage="Overview"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <AgentDetailsOverviewSection agent={agent} agentPolicy={agentPolicy} />
        </FlexItemWithMinWidth>
        <FlexItemWithMinWidth>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.fleet.agentDetails.integrationsSectionTitle"
                defaultMessage="Integrations"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <AgentDetailsIntegrations agent={agent} agentPolicy={agentPolicy} />
        </FlexItemWithMinWidth>
      </EuiFlexGroup>
    </>
  );
});
