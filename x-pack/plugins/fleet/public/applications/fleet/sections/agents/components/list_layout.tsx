/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiButton, EuiPortal } from '@elastic/eui';
import { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import { useRouteMatch } from 'react-router-dom';
import { PAGE_ROUTING_PATHS } from '../../../constants';
import { WithHeaderLayout } from '../../../layouts';
import { useCapabilities, useLink, useGetAgentPolicies } from '../../../hooks';
import { AgentEnrollmentFlyout } from '../components';

export const ListLayout: React.FunctionComponent<{}> = ({ children }) => {
  const { getHref } = useLink();
  const hasWriteCapabilites = useCapabilities().write;

  // Agent enrollment flyout state
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = React.useState<boolean>(false);

  const headerRightColumn = hasWriteCapabilites ? (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiButton fill iconType="plusInCircle" onClick={() => setIsEnrollmentFlyoutOpen(true)}>
          <FormattedMessage id="xpack.fleet.agentList.enrollButton" defaultMessage="Add agent" />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : undefined;
  const headerLeftColumn = (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiText>
          <h1>
            <FormattedMessage id="xpack.fleet.agents.pageTitle" defaultMessage="Agents" />
          </h1>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.fleet.agents.pageSubtitle"
              defaultMessage="Manage and deploy policy updates to a group of agents of any size."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const agentPoliciesRequest = useGetAgentPolicies({
    page: 1,
    perPage: 1000,
  });

  const agentPolicies = agentPoliciesRequest.data ? agentPoliciesRequest.data.items : [];

  const routeMatch = useRouteMatch();

  return (
    <WithHeaderLayout
      leftColumn={headerLeftColumn}
      rightColumn={headerRightColumn}
      tabs={
        ([
          {
            name: <FormattedMessage id="xpack.fleet.listTabs.agentTitle" defaultMessage="Agents" />,
            isSelected: routeMatch.path === PAGE_ROUTING_PATHS.fleet_agent_list,
            href: getHref('fleet_agent_list'),
          },
          {
            name: (
              <FormattedMessage
                id="xpack.fleet.listTabs.enrollmentTokensTitle"
                defaultMessage="Enrollment tokens"
              />
            ),
            isSelected: routeMatch.path === PAGE_ROUTING_PATHS.fleet_enrollment_tokens,
            href: getHref('fleet_enrollment_tokens'),
          },
        ] as unknown) as EuiTabProps[]
      }
    >
      {isEnrollmentFlyoutOpen ? (
        <EuiPortal>
          <AgentEnrollmentFlyout
            agentPolicies={agentPolicies}
            onClose={() => setIsEnrollmentFlyoutOpen(false)}
          />
        </EuiPortal>
      ) : null}
      {children}
    </WithHeaderLayout>
  );
};
