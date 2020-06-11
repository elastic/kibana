/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import {
  EuiButton,
  EuiBetaBadge,
  EuiText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { WithHeaderLayout } from '../../layouts';
import { useGetAgentConfigs, useBreadcrumbs } from '../../hooks';
import { AgentEnrollmentFlyout } from '../fleet/components';
import { OverviewAgentSection } from './components/agent_section';
import { OverviewConfigurationSection } from './components/configuration_section';
import { OverviewIntegrationSection } from './components/integration_section';
import { OverviewDatastreamSection } from './components/datastream_section';

const AlphaBadge = styled(EuiBetaBadge)`
  vertical-align: top;
  margin-left: ${(props) => props.theme.eui.paddingSizes.s};
`;

export const IngestManagerOverview: React.FunctionComponent = () => {
  useBreadcrumbs('overview');

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
                <AlphaBadge
                  label={i18n.translate('xpack.ingestManager.alphaBadge.labelText', {
                    defaultMessage: 'Experimental',
                  })}
                  title={i18n.translate('xpack.ingestManager.alphaBadge.titleText', {
                    defaultMessage: 'Experimental',
                  })}
                  tooltipContent={i18n.translate('xpack.ingestManager.alphaBadge.tooltipText', {
                    defaultMessage:
                      'This plugin might change or be removed in a future release and is not subject to the support SLA.',
                  })}
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
