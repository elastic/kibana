/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo } from 'react';
import { useRouteMatch, Switch, Route } from 'react-router-dom';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiText } from '@elastic/eui';
import { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AgentRefreshContext } from './hooks';
import { FLEET_AGENTS_PATH, FLEET_AGENT_DETAIL_PATH } from '../../../constants';
import { Loading, Error } from '../../../components';
import { useGetOneAgent, useLink } from '../../../hooks';
import { WithHeaderLayout } from '../../../layouts';
import { AgentEventsTable, AgentDetailSection } from './components';

export const AgentDetailsPage: React.FunctionComponent = () => {
  const {
    params: { agentId, tabId = '' },
  } = useRouteMatch<{ agentId: string; tabId?: string }>();
  const { isLoading, isInitialRequest, error, data: agentData, sendRequest } = useGetOneAgent(
    agentId,
    {
      pollIntervalMs: 5000,
    }
  );
  const agentListUrl = useLink(FLEET_AGENTS_PATH);
  const agentActivityTabUrl = useLink(`${FLEET_AGENT_DETAIL_PATH}${agentId}/activity`);
  const agentDetailsTabUrl = useLink(`${FLEET_AGENT_DETAIL_PATH}${agentId}/details`);

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
              {agentData?.item?.local_metadata.host || (
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

  const headerTabs = useMemo(() => {
    return [
      {
        id: 'activity_log',
        name: i18n.translate('xpack.ingestManager.agentDetails.subTabs.activityLogTab', {
          defaultMessage: 'Activity log',
        }),
        href: agentActivityTabUrl,
        isSelected: !tabId || tabId === 'activity_log',
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
    <AgentRefreshContext.Provider value={{ refresh: () => sendRequest() }}>
      <WithHeaderLayout
        leftColumn={headerLeftContent}
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
                return <div>Details placeholder</div>;
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
