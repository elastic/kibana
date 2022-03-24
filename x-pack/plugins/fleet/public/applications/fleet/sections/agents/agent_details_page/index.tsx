/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { useRouteMatch, Switch, Route, useLocation } from 'react-router-dom';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiText, EuiSpacer } from '@elastic/eui';
import type { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { Agent, AgentPolicy, AgentDetailsReassignPolicyAction } from '../../../types';
import { FLEET_ROUTING_PATHS } from '../../../constants';
import { Loading, Error } from '../../../components';
import {
  useGetOneAgent,
  useGetOneAgentPolicy,
  useLink,
  useBreadcrumbs,
  useStartServices,
  useIntraAppState,
} from '../../../hooks';
import { WithHeaderLayout } from '../../../layouts';

import { AgentRefreshContext } from './hooks';
import {
  AgentLogs,
  AgentDetailsActionMenu,
  AgentDetailsContent,
  AgentDashboardLink,
} from './components';

export const AgentDetailsPage: React.FunctionComponent = () => {
  const {
    params: { agentId, tabId = '' },
  } = useRouteMatch<{ agentId: string; tabId?: string }>();
  const { getHref } = useLink();
  const {
    isLoading,
    isInitialRequest,
    error,
    data: agentData,
    resendRequest: sendAgentRequest,
  } = useGetOneAgent(agentId, {
    pollIntervalMs: 5000,
  });
  const {
    isLoading: isAgentPolicyLoading,
    data: agentPolicyData,
    sendRequest: sendAgentPolicyRequest,
  } = useGetOneAgentPolicy(agentData?.item?.policy_id);

  const {
    application: { navigateToApp },
  } = useStartServices();
  const routeState = useIntraAppState<AgentDetailsReassignPolicyAction>();
  const queryParams = new URLSearchParams(useLocation().search);
  const openReassignFlyoutOpenByDefault = queryParams.get('openReassignFlyout') === 'true';

  const reassignCancelClickHandler = useCallback(() => {
    if (routeState && routeState.onDoneNavigateTo) {
      navigateToApp(routeState.onDoneNavigateTo[0], routeState.onDoneNavigateTo[1]);
    }
  }, [routeState, navigateToApp]);

  const host = agentData?.item?.local_metadata?.host;

  const headerLeftContent = useMemo(
    () => (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" href={getHref('agent_list')} flush="left" size="xs">
            <FormattedMessage
              id="xpack.fleet.agentDetails.viewAgentListTitle"
              defaultMessage="View all agents"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText className="eui-textBreakWord">
            <h1>
              {isLoading && isInitialRequest ? (
                <Loading />
              ) : typeof host === 'object' && typeof host?.hostname === 'string' ? (
                host.hostname
              ) : (
                <FormattedMessage
                  id="xpack.fleet.agentDetails.agentDetailsTitle"
                  defaultMessage="Agent '{id}'"
                  values={{
                    id: agentId,
                  }}
                />
              )}
            </h1>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [host, agentId, getHref, isInitialRequest, isLoading]
  );

  const headerRightContent = useMemo(
    () =>
      agentData && agentData.item ? (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s" direction="row">
            {!isAgentPolicyLoading && !agentPolicyData?.item?.is_managed && (
              <EuiFlexItem grow={false}>
                <AgentDetailsActionMenu
                  agent={agentData.item}
                  agentPolicy={agentPolicyData?.item}
                  assignFlyoutOpenByDefault={openReassignFlyoutOpenByDefault}
                  onCancelReassign={
                    routeState && routeState.onDoneNavigateTo
                      ? reassignCancelClickHandler
                      : undefined
                  }
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <AgentDashboardLink agent={agentData?.item} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : undefined,
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [agentPolicyData, agentData, getHref, isAgentPolicyLoading]
  );

  const headerTabs = useMemo(() => {
    return [
      {
        id: 'details',
        name: i18n.translate('xpack.fleet.agentDetails.subTabs.detailsTab', {
          defaultMessage: 'Agent details',
        }),
        href: getHref('agent_details', { agentId, tabId: 'details' }),
        isSelected: !tabId || tabId === 'details',
      },
      {
        id: 'logs',
        name: i18n.translate('xpack.fleet.agentDetails.subTabs.logsTab', {
          defaultMessage: 'Logs',
        }),
        href: getHref('agent_details_logs', { agentId, tabId: 'logs' }),
        isSelected: tabId === 'logs',
      },
    ];
  }, [getHref, agentId, tabId]);

  return (
    <AgentRefreshContext.Provider
      value={{
        refresh: () => {
          sendAgentRequest();
          sendAgentPolicyRequest();
        },
      }}
    >
      <WithHeaderLayout
        leftColumn={headerLeftContent}
        rightColumn={headerRightContent}
        tabs={headerTabs as unknown as EuiTabProps[]}
      >
        {isLoading && isInitialRequest ? (
          <Loading />
        ) : error ? (
          <Error
            title={
              <FormattedMessage
                id="xpack.fleet.agentDetails.unexceptedErrorTitle"
                defaultMessage="Error loading agent"
              />
            }
            error={error}
          />
        ) : agentData && agentData.item ? (
          <AgentDetailsPageContent agent={agentData.item} agentPolicy={agentPolicyData?.item} />
        ) : (
          <Error
            title={
              <FormattedMessage
                id="xpack.fleet.agentDetails.agentNotFoundErrorTitle"
                defaultMessage="Agent not found"
              />
            }
            error={i18n.translate('xpack.fleet.agentDetails.agentNotFoundErrorDescription', {
              defaultMessage: 'Cannot find agent ID {agentId}',
              values: {
                agentId,
              },
            })}
          />
        )}
      </WithHeaderLayout>
    </AgentRefreshContext.Provider>
  );
};

const AgentDetailsPageContent: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
}> = ({ agent, agentPolicy }) => {
  useBreadcrumbs('agent_details', {
    agentHost:
      typeof agent.local_metadata.host === 'object' &&
      typeof agent.local_metadata.host.hostname === 'string'
        ? agent.local_metadata.host.hostname
        : '-',
  });
  return (
    <Switch>
      <Route
        path={FLEET_ROUTING_PATHS.agent_details_logs}
        render={() => {
          return <AgentLogs agent={agent} agentPolicy={agentPolicy} />;
        }}
      />
      <Route
        path={FLEET_ROUTING_PATHS.agent_details}
        render={() => {
          return <AgentDetailsContent agent={agent} agentPolicy={agentPolicy} />;
        }}
      />
    </Switch>
  );
};
