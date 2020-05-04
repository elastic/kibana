/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiPanel,
  EuiBetaBadge,
  EuiText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { WithHeaderLayout } from '../../layouts';
import { useGetAgentConfigs } from '../../hooks';
import { AgentEnrollmentFlyout } from '../fleet/agent_list_page/components';
import { OverviewAgentSection } from './components/agent_section';
import { OverviewConfigurationSection } from './components/configuration_section';
import { OverviewIntegrationSection } from './components/integration_section';
import { OverviewDatastreamSection } from './components/datastream_section';

export const IngestManagerOverview: React.FunctionComponent = () => {
  // Agent enrollment flyout state
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState<boolean>(false);

  // Agent configs required for enrollment flyout
  const agentConfigsRequest = useGetAgentConfigs({
    page: 1,
    perPage: 1000,
  });
  const agentConfigs = agentConfigsRequest.data ? agentConfigsRequest.data.items : [];

  return (
    <WithHeaderLayout
      leftColumn={
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <EuiText>
              <h1>
                <FormattedMessage
                  id="xpack.ingestManager.overviewPageTitle"
                  defaultMessage="Ingest Manager"
                />
              </h1>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.ingestManager.overviewPageSubtitle"
                  defaultMessage="Centralized management for Elastic Agents and configurations."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      rightColumn={
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton fill iconType="plusInCircle" onClick={() => setIsEnrollmentFlyoutOpen(true)}>
              <FormattedMessage
                id="xpack.ingestManager.overviewPageEnrollAgentButton"
                defaultMessage="Enroll new agent"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      {isEnrollmentFlyoutOpen && (
        <AgentEnrollmentFlyout
          agentConfigs={agentConfigs}
          onClose={() => setIsEnrollmentFlyoutOpen(false)}
        />
      )}

      <EuiFlexGrid gutterSize="l" columns={2}>
        <OverviewIntegrationSection />
        <OverviewConfigurationSection agentConfigs={agentConfigs} />
        <OverviewAgentSection />
        <OverviewDatastreamSection />
      </EuiFlexGrid>
    </WithHeaderLayout>
  );
};
