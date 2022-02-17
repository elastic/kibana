/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Agent, AgentPolicy } from '../../../../../types';

import { AgentDetailsOverviewSection } from './agent_details_overview';
import { AgentDetailsIntegrationsSection } from './agent_details_integrations';

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
          <AgentDetailsIntegrationsSection agent={agent} agentPolicy={agentPolicy} />
        </FlexItemWithMinWidth>
      </EuiFlexGroup>
    </>
  );
});
