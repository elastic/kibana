/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import type { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';
import { Route, Switch, useLocation, useRouteMatch } from 'react-router-dom';

import { isAgentUpgradeable } from '../../../../../../common/services/is_agent_upgradeable';
import type { Agent } from '../../../../../../common/types/models/agent';
import type { AgentPolicy } from '../../../../../../common/types/models/agent_policy';
import { Error } from '../../../../../components/error';
import { Loading } from '../../../../../components/loading';
import { FLEET_ROUTING_PATHS } from '../../../../../constants/page_paths';
import { useStartServices } from '../../../../../hooks/use_core';
import { useIntraAppState } from '../../../../../hooks/use_intra_app_state';
import { useKibanaVersion } from '../../../../../hooks/use_kibana_version';
import { useLink } from '../../../../../hooks/use_link';
import { useGetOneAgent } from '../../../../../hooks/use_request/agents';
import { useGetOneAgentPolicy } from '../../../../../hooks/use_request/agent_policy';
import { WithHeaderLayout } from '../../../../../layouts/with_header';
import type { AgentDetailsReassignPolicyAction } from '../../../../../types/intra_app_route_state';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { AgentHealth } from '../components/agent_health';

import { AgentDetailsActionMenu } from './components/actions_menu';
import { AgentDetailsContent } from './components/agent_details';
import { AgentLogs } from './components/agent_logs';
import { AgentRefreshContext } from './hooks/use_agent';

export const AgentDetailsPage: React.FunctionComponent = () => {
  const {
    params: { agentId, tabId = '' },
  } = useRouteMatch<{ agentId: string; tabId?: string }>();
  const { getHref } = useLink();
  const kibanaVersion = useKibanaVersion();
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
        <EuiFlexGroup justifyContent={'spaceBetween'} direction="row">
          {[
            {
              label: i18n.translate('xpack.fleet.agentDetails.statusLabel', {
                defaultMessage: 'Status',
              }),
              content: <AgentHealth agent={agentData.item} />,
            },
            {
              label: i18n.translate('xpack.fleet.agentDetails.lastActivityLabel', {
                defaultMessage: 'Last activity',
              }),
              content: agentData.item.last_checkin ? (
                <FormattedRelative value={new Date(agentData.item.last_checkin)} />
              ) : (
                '-'
              ),
            },
            {
              label: i18n.translate('xpack.fleet.agentDetails.policyLabel', {
                defaultMessage: 'Policy',
              }),
              content: isAgentPolicyLoading ? (
                <Loading size="m" />
              ) : agentPolicyData?.item ? (
                <EuiLink
                  href={getHref('policy_details', { policyId: agentData.item.policy_id! })}
                  className="eui-textBreakWord"
                >
                  {agentPolicyData.item.name || agentData.item.policy_id}
                </EuiLink>
              ) : (
                agentData.item.policy_id || '-'
              ),
            },
            {
              label: i18n.translate('xpack.fleet.agentDetails.agentVersionLabel', {
                defaultMessage: 'Agent version',
              }),
              content:
                typeof agentData.item.local_metadata.elastic === 'object' &&
                typeof agentData.item.local_metadata.elastic.agent === 'object' &&
                typeof agentData.item.local_metadata.elastic.agent.version === 'string' ? (
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem grow={false} className="eui-textNoWrap">
                      {agentData.item.local_metadata.elastic.agent.version}
                    </EuiFlexItem>
                    {isAgentUpgradeable(agentData.item, kibanaVersion) ? (
                      <EuiFlexItem grow={false}>
                        <EuiIconTip
                          aria-label={i18n.translate(
                            'xpack.fleet.agentDetails.upgradeAvailableTooltip',
                            {
                              defaultMessage: 'Upgrade available',
                            }
                          )}
                          size="m"
                          type="alert"
                          color="warning"
                          content={i18n.translate(
                            'xpack.fleet.agentDetails.upgradeAvailableTooltip',
                            {
                              defaultMessage: 'Upgrade available',
                            }
                          )}
                        />
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                ) : (
                  '-'
                ),
            },
            {
              content:
                isAgentPolicyLoading || agentPolicyData?.item?.is_managed ? undefined : (
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
                ),
            },
          ].map((item, index) => (
            <EuiFlexItem grow={false} key={index}>
              {item.label ? (
                <EuiDescriptionList compressed>
                  <EuiDescriptionListTitle>{item.label}</EuiDescriptionListTitle>
                  <EuiDescriptionListDescription>{item.content}</EuiDescriptionListDescription>
                </EuiDescriptionList>
              ) : (
                item.content
              )}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
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
        tabs={(headerTabs as unknown) as EuiTabProps[]}
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
