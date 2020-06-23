/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';
import {
  EuiHealth,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiI18nNumber,
  EuiButton,
} from '@elastic/eui';
import { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import { useRouteMatch } from 'react-router-dom';
import { PAGE_ROUTING_PATHS } from '../../../constants';
import { WithHeaderLayout } from '../../../layouts';
import { useCapabilities, useLink, useGetAgentConfigs } from '../../../hooks';
import { useGetAgentStatus } from '../../agent_config/details_page/hooks';
import { AgentEnrollmentFlyout } from '../components';
import { DonutChart } from './donut_chart';

const REFRESH_INTERVAL_MS = 5000;

const Divider = styled.div`
  width: 0;
  height: 100%;
  border-left: ${(props) => props.theme.eui.euiBorderThin};
  height: 45px;
`;

export const ListLayout: React.FunctionComponent<{}> = ({ children }) => {
  const { getHref } = useLink();
  const hasWriteCapabilites = useCapabilities().write;
  const agentStatusRequest = useGetAgentStatus(undefined, {
    pollIntervalMs: REFRESH_INTERVAL_MS,
  });
  const agentStatus = agentStatusRequest.data?.results;

  // Agent enrollment flyout state
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = React.useState<boolean>(false);

  const headerRightColumn = (
    <EuiFlexGroup justifyContent={'flexEnd'} direction="row">
      <EuiFlexItem grow={false}>
        <EuiStat
          titleSize="xs"
          textAlign="right"
          title={<EuiI18nNumber value={agentStatus?.total ?? 0} />}
          description={i18n.translate('xpack.ingestManager.agentListStatus.totalLabel', {
            defaultMessage: 'Agents',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DonutChart
          width={40}
          height={40}
          data={{
            online: agentStatus?.online || 0,
            offline: agentStatus?.offline || 0,
            error: agentStatus?.error || 0,
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          textAlign="right"
          titleSize="xs"
          title={
            <EuiHealth color="success">
              <EuiI18nNumber value={agentStatus?.online ?? 0} />
            </EuiHealth>
          }
          description={i18n.translate('xpack.ingestManager.agentListStatus.onlineLabel', {
            defaultMessage: 'Online',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          textAlign="right"
          titleSize="xs"
          title={<EuiI18nNumber value={agentStatus?.offline ?? 0} />}
          description={i18n.translate('xpack.ingestManager.agentListStatus.offlineLabel', {
            defaultMessage: 'Offline',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          textAlign="right"
          titleSize="xs"
          title={<EuiI18nNumber value={agentStatus?.error ?? 0} />}
          description={i18n.translate('xpack.ingestManager.agentListStatus.errorLabel', {
            defaultMessage: 'Error',
          })}
        />
      </EuiFlexItem>
      {hasWriteCapabilites && (
        <>
          <EuiFlexItem grow={false}>
            <Divider />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill iconType="plusInCircle" onClick={() => setIsEnrollmentFlyoutOpen(true)}>
              <FormattedMessage
                id="xpack.ingestManager.agentList.enrollButton"
                defaultMessage="Enroll new agent"
              />
            </EuiButton>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
  const headerLeftColumn = (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiText>
          <h1>
            <FormattedMessage id="xpack.ingestManager.fleet.pageTitle" defaultMessage="Fleet" />
          </h1>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.ingestManager.fleet.pageSubtitle"
              defaultMessage="Manage and deploy configuration updates to a group of agents of any size."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const agentConfigsRequest = useGetAgentConfigs({
    page: 1,
    perPage: 1000,
  });

  const agentConfigs = agentConfigsRequest.data ? agentConfigsRequest.data.items : [];

  const routeMatch = useRouteMatch();

  return (
    <WithHeaderLayout
      leftColumn={headerLeftColumn}
      rightColumn={headerRightColumn}
      tabs={
        ([
          {
            name: (
              <FormattedMessage
                id="xpack.ingestManager.listTabs.agentTitle"
                defaultMessage="Agents"
              />
            ),
            isSelected: routeMatch.path === PAGE_ROUTING_PATHS.fleet_agent_list,
            href: getHref('fleet_agent_list'),
          },
          {
            name: (
              <FormattedMessage
                id="xpack.ingestManager.listTabs.enrollmentTokensTitle"
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
        <AgentEnrollmentFlyout
          agentConfigs={agentConfigs}
          onClose={() => setIsEnrollmentFlyoutOpen(false)}
        />
      ) : null}
      {children}
    </WithHeaderLayout>
  );
};
