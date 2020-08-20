/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiButton,
  EuiBetaBadge,
  EuiText,
  EuiTitle,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { WithHeaderLayout } from '../../layouts';
import { useGetAgentPolicies, useBreadcrumbs } from '../../hooks';
import { AgentEnrollmentFlyout } from '../fleet/components';
import { OverviewAgentSection } from './components/agent_section';
import { OverviewPolicySection } from './components/agent_policy_section';
import { OverviewIntegrationSection } from './components/integration_section';
import { OverviewDatastreamSection } from './components/datastream_section';

export const IngestManagerOverview: React.FunctionComponent = () => {
  useBreadcrumbs('overview');

  // Agent enrollment flyout state
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState<boolean>(false);

  // Agent policies required for enrollment flyout
  const agentPoliciesRequest = useGetAgentPolicies({
    page: 1,
    perPage: 1000,
  });
  const agentPolicies = agentPoliciesRequest.data ? agentPoliciesRequest.data.items : [];

  return (
    <WithHeaderLayout
      leftColumn={
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="xpack.ingestManager.overviewPageTitle"
                      defaultMessage="Ingest Manager"
                    />
                  </h1>
                </EuiTitle>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  label={i18n.translate('xpack.ingestManager.betaBadge.labelText', {
                    defaultMessage: 'Beta',
                  })}
                  tooltipContent={i18n.translate('xpack.ingestManager.betaBadge.tooltipText', {
                    defaultMessage:
                      'This plugin is not recommended for production environments. Please report bugs in our Discuss forum.',
                  })}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.ingestManager.overviewPageSubtitle"
                  defaultMessage="Manage Elastic Agents and their policies in a central location."
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
                defaultMessage="Add agent"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      {isEnrollmentFlyoutOpen && (
        <AgentEnrollmentFlyout
          agentPolicies={agentPolicies}
          onClose={() => setIsEnrollmentFlyoutOpen(false)}
        />
      )}

      <EuiFlexGrid gutterSize="l" columns={2}>
        <OverviewIntegrationSection />
        <OverviewPolicySection agentPolicies={agentPolicies} />
        <OverviewAgentSection />
        <OverviewDatastreamSection />
      </EuiFlexGrid>
    </WithHeaderLayout>
  );
};
