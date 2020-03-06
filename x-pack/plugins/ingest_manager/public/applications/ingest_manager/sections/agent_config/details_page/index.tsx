/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import { Redirect, useRouteMatch } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiText,
  EuiSpacer,
  EuiTitle,
  EuiHealth,
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiBadge,
} from '@elastic/eui';
import { useGetOneAgentConfig, useLink } from '../../../hooks';
import { AGENT_CONFIG_DETAILS_PATH } from '../../../constants';
import { Datasource } from '../../../types';
import { Loading } from '../../../components';
import { ConnectedLink } from '../../fleet/components';
import { WithHeaderLayout } from '../../../layouts';
import { AgentConfigDeleteProvider } from '../components';
import { ConfigRefreshContext, useGetAgentStatus, AgentStatusRefreshContext } from './hooks';
import { DatasourcesTable, DonutChart, EditConfigFlyout } from './components';

export const AgentConfigDetailsPage: React.FunctionComponent = () => {
  const {
    params: { configId },
  } = useRouteMatch<{ configId: string }>();
  const agentConfigRequest = useGetOneAgentConfig(configId);
  const agentConfig = agentConfigRequest.data ? agentConfigRequest.data.item : null;
  const { isLoading, error, sendRequest: refreshAgentConfig } = agentConfigRequest;
  const [redirectToAgentConfigList, setRedirectToAgentConfigsList] = useState<boolean>(false);
  const {
    result: agentStatus,
    isLoading: agentStatusIsLoading,
    error: agentStatusError,
    refreshAgentStatus,
  } = useGetAgentStatus(configId);
  const ADD_DATASOURCE_URI = useLink(`${AGENT_CONFIG_DETAILS_PATH}${configId}/add-datasource`);

  // Flyout states
  const [isEditConfigFlyoutOpen, setIsEditConfigFlyoutOpen] = useState<boolean>(false);

  const refreshData = () => {
    refreshAgentConfig();
    refreshAgentStatus();
  };

  if (redirectToAgentConfigList) {
    return <Redirect to="/" />;
  }

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <WithHeaderLayout>
        <EuiCallOut
          title={i18n.translate('xpack.ingestManager.configDetails.unexceptedErrorTitle', {
            defaultMessage: 'An error happened while loading the config',
          })}
          color="danger"
          iconType="alert"
        >
          <p>
            <EuiText>{error.message}</EuiText>
          </p>
        </EuiCallOut>
      </WithHeaderLayout>
    );
  }

  if (!agentConfig) {
    return (
      <WithHeaderLayout>
        <FormattedMessage
          id="xpack.ingestManager.configDetails.configNotFoundErrorTitle"
          defaultMessage="Config '{id}' not found"
          values={{
            id: configId,
          }}
        />
      </WithHeaderLayout>
    );
  }

  return (
    <ConfigRefreshContext.Provider value={{ refresh: refreshAgentConfig }}>
      <AgentStatusRefreshContext.Provider value={{ refresh: refreshAgentStatus }}>
        <WithHeaderLayout
          leftColumn={
            <React.Fragment>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="l">
                        <h1>
                          {agentConfig.name || (
                            <FormattedMessage
                              id="xpack.ingestManager.configDetails.configDetailsTitle"
                              defaultMessage="Config '{id}'"
                              values={{
                                id: configId,
                              }}
                            />
                          )}
                        </h1>
                      </EuiTitle>
                    </EuiFlexItem>
                    {agentConfig.name ? (
                      <EuiFlexItem grow={false}>
                        <EuiBadge>{agentConfig.name}</EuiBadge>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                  {agentConfig.description ? (
                    <Fragment>
                      <EuiSpacer size="s" />
                      <EuiText color="subdued">{agentConfig.description}</EuiText>
                    </Fragment>
                  ) : null}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiButton onClick={() => setIsEditConfigFlyoutOpen(true)} iconType="pencil">
                        <FormattedMessage
                          id="xpack.ingestManager.configDetails.editConfigButtonLabel"
                          defaultMessage="Edit config"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <AgentConfigDeleteProvider>
                        {deleteConfigsPrompt => (
                          <EuiButtonEmpty
                            color="danger"
                            onClick={() => {
                              deleteConfigsPrompt([configId], () => {
                                setRedirectToAgentConfigsList(true);
                              });
                            }}
                            disabled={agentConfig.is_default}
                          >
                            <FormattedMessage
                              id="xpack.ingestManager.configDetails.deleteConfigButtonLabel"
                              defaultMessage="Delete"
                            />
                          </EuiButtonEmpty>
                        )}
                      </AgentConfigDeleteProvider>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="l" />
            </React.Fragment>
          }
        >
          {isEditConfigFlyoutOpen ? (
            <EditConfigFlyout
              onClose={() => {
                setIsEditConfigFlyoutOpen(false);
                refreshData();
              }}
              agentConfig={agentConfig}
            />
          ) : null}
          <EuiTitle size="m">
            <h3>
              <FormattedMessage
                id="xpack.ingestManager.configDetails.agentsSummaryTitle"
                defaultMessage="Enrolled agents"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="l" />
          {agentStatusIsLoading ? (
            <Loading />
          ) : agentStatusError ? (
            <FormattedMessage
              id="xpack.ingestManager.configDetails.agentStatusNotFoundErrorTitle"
              defaultMessage="Unable to load enrolled agents status"
            />
          ) : (
            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h5>
                    <FormattedMessage
                      id="xpack.ingestManager.configDetails.agentsTotalTitle"
                      defaultMessage="Total"
                    />
                  </h5>
                </EuiTitle>
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="l">
                      <span>{agentStatus.total}</span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {/* TODO: Make this link to filtered agents list and change to real agent count */}
                    <ConnectedLink color="primary" path={`/fleet/agents`}>
                      <FormattedMessage
                        id="xpack.ingestManager.configDetails.viewAgentsLinkText"
                        defaultMessage="View agents"
                      />
                    </ConnectedLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h5>
                    <FormattedMessage
                      id="xpack.ingestManager.configDetails.eventsTitle"
                      defaultMessage="Events"
                    />
                  </h5>
                </EuiTitle>
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="l">
                      <span>{agentStatus.events}</span>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h5>
                    <FormattedMessage
                      id="xpack.ingestManager.configDetails.agentsStatusTitle"
                      defaultMessage="Status"
                    />
                  </h5>
                </EuiTitle>
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem grow={false}>
                    <DonutChart
                      height={150}
                      width={150}
                      data={
                        agentStatus.total === 0
                          ? {
                              online: 0,
                              offline: 1,
                              error: 0,
                            }
                          : {
                              online: agentStatus.online,
                              offline: agentStatus.offline,
                              error: agentStatus.error,
                            }
                      }
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiHealth color="success">
                      <FormattedMessage
                        id="xpack.ingestManager.configDetails.onlineAgentsCountText"
                        defaultMessage="{count} online"
                        values={{
                          count: agentStatus.online,
                        }}
                      />
                    </EuiHealth>
                    <EuiSpacer size="s" />
                    <EuiHealth color="subdued">
                      <FormattedMessage
                        id="xpack.ingestManager.configDetails.offlineAgentsCountText"
                        defaultMessage="{count} offline"
                        values={{
                          count: agentStatus.offline,
                        }}
                      />
                    </EuiHealth>
                    <EuiSpacer size="s" />
                    <EuiHealth color="danger">
                      <FormattedMessage
                        id="xpack.ingestManager.configDetails.errorAgentsCountText"
                        defaultMessage="{count} error"
                        values={{
                          count: agentStatus.error,
                        }}
                      />
                    </EuiHealth>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          <EuiSpacer size="xl" />
          <EuiTitle size="m">
            <h3>
              <FormattedMessage
                id="xpack.ingestManager.configDetails.datasourcesTableTitle"
                defaultMessage="Data sources"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="l" />
          <DatasourcesTable
            datasources={agentConfig.datasources as Datasource[]}
            message={
              !agentConfig.datasources || agentConfig.datasources.length === 0 ? (
                <EuiEmptyPrompt
                  title={
                    <h2>
                      <FormattedMessage
                        id="xpack.ingestManager.configDetails.noDatasourcesPrompt"
                        defaultMessage="Config has no data sources"
                      />
                    </h2>
                  }
                  actions={
                    <EuiButton fill iconType="plusInCircle" href={ADD_DATASOURCE_URI}>
                      <FormattedMessage
                        id="xpack.ingestManager.configDetails.addDatasourceButtonText"
                        defaultMessage="Add a data source"
                      />
                    </EuiButton>
                  }
                />
              ) : null
            }
            search={{
              toolsRight: [
                <EuiButton fill iconType="plusInCircle" href={ADD_DATASOURCE_URI}>
                  <FormattedMessage
                    id="xpack.ingestManager.configDetails.addDatasourceButtonText"
                    defaultMessage="Add a data source"
                  />
                </EuiButton>,
              ],
              box: {
                incremental: true,
                schema: true,
              },
            }}
            isSelectable={false}
          />
        </WithHeaderLayout>
      </AgentStatusRefreshContext.Provider>
    </ConfigRefreshContext.Provider>
  );
};
