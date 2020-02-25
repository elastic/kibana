/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
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
import { Redirect, useRouteMatch } from 'react-router-dom';
import { PolicyRefreshContext, useGetAgentStatus, AgentStatusRefreshContext } from './hooks';
import {
  DatasourcesTable,
  DonutChart,
  EditPolicyFlyout,
  AssignDatasourcesFlyout,
} from './components';
import { sendRequest, useCore, useGetOneAgentConfig } from '../../../hooks';
import { Datasource } from '../../../types';
import { Loading } from '../../../components';
import { ConnectedLink } from '../../fleet/components';
import { WithHeaderLayout } from '../../../layouts';
import { AgentConfigDeleteProvider } from '../components';
import { DEFAULT_AGENT_CONFIG_ID } from '../../../constants';

export const AgentConfigDetailsPage: React.FunctionComponent = () => {
  const {
    params: { configId },
  } = useRouteMatch<{ configId: string }>();
  const core = useCore();
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

  // Unassign data sources states
  const [isUnassignLoading, setIsUnassignLoading] = useState<boolean>(false);
  const [selectedDatasources, setSelectedDatasources] = useState<string[]>([]);

  // Flyout states
  const [isEditPolicyFlyoutOpen, setIsEditPolicyFlyoutOpen] = useState<boolean>(false);
  const [isDatasourcesFlyoutOpen, setIsDatasourcesFlyoutOpen] = useState<boolean>(false);

  const refreshData = () => {
    refreshAgentConfig();
    refreshAgentStatus();
  };

  const unassignSelectedDatasources = async () => {
    setIsUnassignLoading(true);
    const { error: unassignError } = await sendRequest({
      path: `/api/ingest_manager/agent_configs/${configId}/removeDatasources`,
      method: 'post',
      body: {
        datasources: selectedDatasources,
      },
    });
    setIsUnassignLoading(false);
    if (unassignError) {
      core.notifications.toasts.addDanger(
        i18n.translate(
          'xpack.ingestManager.policyDetails.unassignDatasources.errorNotificationTitle',
          {
            defaultMessage:
              'Error unassigning {count, plural, one {data source} other {# data sources}}',
            values: {
              count: selectedDatasources.length,
            },
          }
        )
      );
    } else {
      core.notifications.toasts.addSuccess(
        i18n.translate(
          'xpack.ingestManager.policyDetails.unassignDatasources.successNotificationTitle',
          {
            defaultMessage:
              'Successfully unassigned {count, plural, one {data source} other {# data sources}}',
            values: {
              count: selectedDatasources.length,
            },
          }
        )
      );
      setSelectedDatasources([]);
      refreshData();
    }
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
          title={i18n.translate('xpack.ingestManager.policyDetails.unexceptedErrorTitle', {
            defaultMessage: 'An error happened while loading the policy',
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
          id="xpack.ingestManager.policyDetails.policyNotFoundErrorTitle"
          defaultMessage="Policy '{id}' not found"
          values={{
            id: configId,
          }}
        />
      </WithHeaderLayout>
    );
  }

  return (
    <PolicyRefreshContext.Provider value={{ refresh: refreshAgentConfig }}>
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
                              id="xpack.ingestManager.policyDetails.policyDetailsTitle"
                              defaultMessage="Policy '{id}'"
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
                      <EuiButton onClick={() => setIsEditPolicyFlyoutOpen(true)} iconType="pencil">
                        <FormattedMessage
                          id="xpack.ingestManager.policyDetails.editPolicyButtonLabel"
                          defaultMessage="Edit policy"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <AgentConfigDeleteProvider>
                        {deletePoliciesPrompt => (
                          <EuiButtonEmpty
                            color="danger"
                            onClick={() => {
                              deletePoliciesPrompt([configId], () => {
                                setRedirectToAgentConfigsList(true);
                              });
                            }}
                            disabled={configId === DEFAULT_AGENT_CONFIG_ID}
                          >
                            <FormattedMessage
                              id="xpack.ingestManager.policyDetails.deletePolicyButtonLabel"
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
          {isEditPolicyFlyoutOpen ? (
            <EditPolicyFlyout
              onClose={() => {
                setIsEditPolicyFlyoutOpen(false);
                refreshData();
              }}
              agentConfig={agentConfig}
            />
          ) : null}
          {isDatasourcesFlyoutOpen ? (
            <AssignDatasourcesFlyout
              policyId={agentConfig.id}
              // @ts-ignore
              existingDatasources={(agentConfig.datasources || []).map((ds: any) => ds.id)}
              onClose={() => {
                setIsDatasourcesFlyoutOpen(false);
                refreshData();
              }}
            />
          ) : null}
          <EuiTitle size="m">
            <h3>
              <FormattedMessage
                id="xpack.ingestManager.policyDetails.agentsSummaryTitle"
                defaultMessage="Enrolled agents"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="l" />
          {agentStatusIsLoading ? (
            <Loading />
          ) : agentStatusError ? (
            <FormattedMessage
              id="xpack.ingestManager.policyDetails.agentStatusNotFoundErrorTitle"
              defaultMessage="Unable to load enrolled agents status"
            />
          ) : (
            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h5>
                    <FormattedMessage
                      id="xpack.ingestManager.policyDetails.agentsTotalTitle"
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
                        id="xpack.ingestManager.policyDetails.viewAgentsLinkText"
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
                      id="xpack.ingestManager.policyDetails.eventsTitle"
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
                      id="xpack.ingestManager.policyDetails.agentsStatusTitle"
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
                        id="xpack.ingestManager.policyDetails.onlineAgentsCountText"
                        defaultMessage="{count} online"
                        values={{
                          count: agentStatus.online,
                        }}
                      />
                    </EuiHealth>
                    <EuiSpacer size="s" />
                    <EuiHealth color="subdued">
                      <FormattedMessage
                        id="xpack.ingestManager.policyDetails.offlineAgentsCountText"
                        defaultMessage="{count} offline"
                        values={{
                          count: agentStatus.offline,
                        }}
                      />
                    </EuiHealth>
                    <EuiSpacer size="s" />
                    <EuiHealth color="danger">
                      <FormattedMessage
                        id="xpack.ingestManager.policyDetails.errorAgentsCountText"
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
                id="xpack.ingestManager.policyDetails.datasourcesTableTitle"
                defaultMessage="Assigned data sources"
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
                        id="xpack.ingestManager.policyDetails.noDatasourcesPrompt"
                        defaultMessage="Policy has no data sources"
                      />
                    </h2>
                  }
                  actions={
                    <EuiButton
                      fill
                      iconType="plusInCircle"
                      onClick={() => setIsDatasourcesFlyoutOpen(true)}
                    >
                      <FormattedMessage
                        id="xpack.ingestManager.policyDetails.assignDatasourcesButtonText"
                        defaultMessage="Assign data sources"
                      />
                    </EuiButton>
                  }
                />
              ) : null
            }
            search={{
              toolsRight: [
                <EuiButton
                  fill
                  iconType="plusInCircle"
                  onClick={() => setIsDatasourcesFlyoutOpen(true)}
                >
                  <FormattedMessage
                    id="xpack.ingestManager.policyDetails.assignDatasourcesButtonText"
                    defaultMessage="Assign data sources"
                  />
                </EuiButton>,
              ],
              toolsLeft: selectedDatasources.length
                ? [
                    <EuiButton
                      color="danger"
                      disabled={isUnassignLoading}
                      isLoading={isUnassignLoading}
                      onClick={unassignSelectedDatasources}
                    >
                      <FormattedMessage
                        id="xpack.ingestManager.policyDetails.unassignDatasourcesButtonLabel"
                        defaultMessage="Unassign {count, plural, one {# data source} other {# data sources}}"
                        values={{
                          count: selectedDatasources.length,
                        }}
                      />
                    </EuiButton>,
                  ]
                : null,
              box: {
                incremental: true,
                schema: true,
              },
            }}
            selection={{
              onSelectionChange: (selection: Array<{ id: string }>) =>
                setSelectedDatasources(selection.map(ds => ds.id)),
            }}
            isSelectable={true}
          />
        </WithHeaderLayout>
      </AgentStatusRefreshContext.Provider>
    </PolicyRefreshContext.Provider>
  );
};
