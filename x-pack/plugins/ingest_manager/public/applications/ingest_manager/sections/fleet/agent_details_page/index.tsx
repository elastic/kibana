/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo, useCallback } from 'react';
import { useRouteMatch, Switch, Route, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  EuiLink,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Agent, AgentConfig, AgentDetailsReassignConfigAction } from '../../../types';
import { PAGE_ROUTING_PATHS } from '../../../constants';
import { Loading, Error } from '../../../components';
import {
  useGetOneAgent,
  useGetOneAgentConfig,
  useLink,
  useBreadcrumbs,
  useCore,
} from '../../../hooks';
import { WithHeaderLayout } from '../../../layouts';
import { AgentHealth } from '../components';
import { AgentRefreshContext } from './hooks';
import { AgentEventsTable, AgentDetailsActionMenu, AgentDetailsContent } from './components';
import { useIntraAppState } from '../../../hooks/use_intra_app_state';

const Divider = styled.div`
  width: 0;
  height: 100%;
  border-left: ${(props) => props.theme.eui.euiBorderThin};
`;

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
    sendRequest: sendAgentRequest,
  } = useGetOneAgent(agentId, {
    pollIntervalMs: 5000,
  });
  const {
    isLoading: isAgentConfigLoading,
    data: agentConfigData,
    sendRequest: sendAgentConfigRequest,
  } = useGetOneAgentConfig(agentData?.item?.config_id);

  const {
    application: { navigateToApp },
  } = useCore();
  const routeState = useIntraAppState<AgentDetailsReassignConfigAction>();
  const queryParams = new URLSearchParams(useLocation().search);
  const openReassignFlyoutOpenByDefault = queryParams.get('openReassignFlyout') === 'true';

  const reassignCancelClickHandler = useCallback(() => {
    if (routeState && routeState.onDoneNavigateTo) {
      navigateToApp(routeState.onDoneNavigateTo[0], routeState.onDoneNavigateTo[1]);
    }
  }, [routeState, navigateToApp]);

  const headerLeftContent = useMemo(
    () => (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem>
          <EuiButtonEmpty
            iconType="arrowLeft"
            href={getHref('fleet_agent_list')}
            flush="left"
            size="xs"
          >
            <FormattedMessage
              id="xpack.ingestManager.agentDetails.viewAgentListTitle"
              defaultMessage="View all agents"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              {typeof agentData?.item?.local_metadata?.host === 'object' &&
              typeof agentData?.item?.local_metadata?.host?.hostname === 'string' ? (
                agentData.item.local_metadata.host.hostname
              ) : (
                <FormattedMessage
                  id="xpack.ingestManager.agentDetails.agentDetailsTitle"
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
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [agentData, agentId, getHref]
  );

  const headerRightContent = useMemo(
    () =>
      agentData && agentData.item ? (
        <EuiFlexGroup justifyContent={'flexEnd'} direction="row">
          {[
            {
              label: i18n.translate('xpack.ingestManager.agentDetails.statusLabel', {
                defaultMessage: 'Status',
              }),
              content: <AgentHealth agent={agentData.item} />,
            },
            { isDivider: true },
            {
              label: i18n.translate('xpack.ingestManager.agentDetails.configurationLabel', {
                defaultMessage: 'Configuration',
              }),
              content: isAgentConfigLoading ? (
                <Loading size="m" />
              ) : agentConfigData?.item ? (
                <EuiLink
                  href={getHref('configuration_details', { configId: agentData.item.config_id! })}
                >
                  {agentConfigData.item.name || agentData.item.config_id}
                </EuiLink>
              ) : (
                agentData.item.config_id || '-'
              ),
            },
            { isDivider: true },
            {
              content: (
                <AgentDetailsActionMenu
                  agent={agentData.item}
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
              {item.isDivider ?? false ? (
                <Divider />
              ) : item.label ? (
                <EuiDescriptionList compressed textStyle="reverse" style={{ textAlign: 'right' }}>
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
    [agentConfigData, agentData, getHref, isAgentConfigLoading]
  );

  const headerTabs = useMemo(() => {
    return [
      {
        id: 'activity_log',
        name: i18n.translate('xpack.ingestManager.agentDetails.subTabs.activityLogTab', {
          defaultMessage: 'Activity log',
        }),
        href: getHref('fleet_agent_details', { agentId, tabId: 'activity' }),
        isSelected: !tabId || tabId === 'activity',
      },
      {
        id: 'details',
        name: i18n.translate('xpack.ingestManager.agentDetails.subTabs.detailsTab', {
          defaultMessage: 'Agent details',
        }),
        href: getHref('fleet_agent_details', { agentId, tabId: 'details' }),
        isSelected: tabId === 'details',
      },
    ];
  }, [getHref, agentId, tabId]);

  return (
    <AgentRefreshContext.Provider
      value={{
        refresh: () => {
          sendAgentRequest();
          sendAgentConfigRequest();
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
                id="xpack.ingestManager.agentDetails.unexceptedErrorTitle"
                defaultMessage="Error loading agent"
              />
            }
            error={error}
          />
        ) : agentData && agentData.item ? (
          <AgentDetailsPageContent agent={agentData.item} agentConfig={agentConfigData?.item} />
        ) : (
          <Error
            title={
              <FormattedMessage
                id="xpack.ingestManager.agentDetails.agentNotFoundErrorTitle"
                defaultMessage="Agent not found"
              />
            }
            error={i18n.translate(
              'xpack.ingestManager.agentDetails.agentNotFoundErrorDescription',
              {
                defaultMessage: 'Cannot find agent ID {agentId}',
                values: {
                  agentId,
                },
              }
            )}
          />
        )}
      </WithHeaderLayout>
    </AgentRefreshContext.Provider>
  );
};

const AgentDetailsPageContent: React.FunctionComponent<{
  agent: Agent;
  agentConfig?: AgentConfig;
}> = ({ agent, agentConfig }) => {
  useBreadcrumbs('fleet_agent_details', {
    agentHost:
      typeof agent.local_metadata.host === 'object' &&
      typeof agent.local_metadata.host.hostname === 'string'
        ? agent.local_metadata.host.hostname
        : '-',
  });
  return (
    <Switch>
      <Route
        path={PAGE_ROUTING_PATHS.fleet_agent_details_details}
        render={() => {
          return <AgentDetailsContent agent={agent} agentConfig={agentConfig} />;
        }}
      />
      <Route
        path={PAGE_ROUTING_PATHS.fleet_agent_details_events}
        render={() => {
          return <AgentEventsTable agent={agent} />;
        }}
      />
    </Switch>
  );
};
