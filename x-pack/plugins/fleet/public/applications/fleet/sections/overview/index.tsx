/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiButton,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { useBreadcrumbs, useGetAgentPolicies } from '../../hooks';
import { WithHeaderLayout } from '../../layouts';
import { AgentEnrollmentFlyout } from '../agents/components';
import { OverviewPolicySection } from './components/agent_policy_section';
import { OverviewAgentSection } from './components/agent_section';
import { OverviewDatastreamSection } from './components/datastream_section';
import { OverviewIntegrationSection } from './components/integration_section';

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
                    <FormattedMessage id="xpack.fleet.overviewPageTitle" defaultMessage="Fleet" />
                  </h1>
                </EuiTitle>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  label={i18n.translate('xpack.fleet.betaBadge.labelText', {
                    defaultMessage: 'Beta',
                  })}
                  tooltipContent={i18n.translate('xpack.fleet.betaBadge.tooltipText', {
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
                  id="xpack.fleet.overviewPageSubtitle"
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
                id="xpack.fleet.overviewPageEnrollAgentButton"
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
