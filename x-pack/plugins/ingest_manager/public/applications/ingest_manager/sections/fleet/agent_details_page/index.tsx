/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo } from 'react';
import { useRouteMatch, Switch, Route } from 'react-router-dom';
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
import { AgentRefreshContext } from './hooks';
import {
  FLEET_AGENTS_PATH,
  FLEET_AGENT_DETAIL_PATH,
  AGENT_CONFIG_DETAILS_PATH,
} from '../../../constants';
import { Loading, Error } from '../../../components';
import { useGetOneAgent, useGetOneAgentConfig, useLink } from '../../../hooks';
import { WithHeaderLayout } from '../../../layouts';
import { AgentHealth } from '../components';
import { AgentEventsTable, AgentDetailsActionMenu, AgentDetailsContent } from './components';

const Divider = styled.div`
  width: 0;
  height: 100%;
  border-left: ${props => props.theme.eui.euiBorderThin};
`;

export const AgentDetailsPage: React.FunctionComponent = () => {
  const {
    params: { agentId, tabId = '' },
  } = useRouteMatch<{ agentId: string; tabId?: string }>();
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

  const agentListUrl = useLink(FLEET_AGENTS_PATH);
  const agentActivityTabUrl = useLink(`${FLEET_AGENT_DETAIL_PATH}${agentId}/activity`);
  const agentDetailsTabUrl = useLink(`${FLEET_AGENT_DETAIL_PATH}${agentId}/details`);
  const agentConfigUrl = useLink(AGENT_CONFIG_DETAILS_PATH);

  const headerLeftContent = useMemo(
    () => (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" href={agentListUrl} flush="left" size="xs">
            <FormattedMessage
              id="xpack.ingestManager.agentDetails.viewAgentListTitle"
              defaultMessage="View all agent configurations"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              {agentData?.item?.local_metadata['host.hostname'] || (
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
    [agentData, agentId, agentListUrl]
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
                <EuiLink href={`${agentConfigUrl}${agentData.item.config_id}`}>
                  {agentConfigData.item.name || agentData.item.config_id}
                </EuiLink>
              ) : (
                agentData.item.config_id || '-'
              ),
            },
            { isDivider: true },
            {
              content: <AgentDetailsActionMenu agent={agentData.item} />,
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
      ) : (
        undefined
      ),
    [agentConfigData, agentConfigUrl, agentData, isAgentConfigLoading]
  );

  const headerTabs = useMemo(() => {
    return [
      {
        id: 'activity_log',
        name: i18n.translate('xpack.ingestManager.agentDetails.subTabs.activityLogTab', {
          defaultMessage: 'Activity log',
        }),
        href: agentActivityTabUrl,
        isSelected: !tabId || tabId === 'activity',
      },
      {
        id: 'details',
        name: i18n.translate('xpack.ingestManager.agentDetails.subTabs.detailsTab', {
          defaultMessage: 'Agent details',
        }),
        href: agentDetailsTabUrl,
        isSelected: tabId === 'details',
      },
    ];
  }, [agentActivityTabUrl, agentDetailsTabUrl, tabId]);

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
          <Switch>
            <Route
              path={`${FLEET_AGENT_DETAIL_PATH}:agentId/details`}
              render={() => {
                return (
                  <AgentDetailsContent agent={agentData.item} agentConfig={agentConfigData?.item} />
                );
              }}
            />
            <Route
              path={`${FLEET_AGENT_DETAIL_PATH}:agentId`}
              render={() => {
                return <AgentEventsTable agent={agentData.item} />;
              }}
            />
          </Switch>
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
                defaultMessage: 'Cannot found agent ID {agentId}',
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
