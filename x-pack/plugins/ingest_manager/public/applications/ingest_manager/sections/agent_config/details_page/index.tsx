/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { Redirect, useRouteMatch, generatePath } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedDate } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiText,
  EuiSpacer,
  EuiTitle,
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiI18nNumber,
  EuiStat,
} from '@elastic/eui';
import { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import { useGetOneAgentConfig, useLink } from '../../../hooks';
import { AGENT_CONFIG_DETAILS_PATH, AGENT_CONFIG_PATH } from '../../../constants';
import { Datasource } from '../../../types';
import { Loading } from '../../../components';
import { WithHeaderLayout } from '../../../layouts';
import { ConfigRefreshContext, useGetAgentStatus, AgentStatusRefreshContext } from './hooks';
import { DatasourcesTable, EditConfigFlyout } from './components';
import { LinkedAgentCount } from '../components';

const DETAILS_ROUTER_PATH = ':configId/:tabId';

export const AgentConfigDetailsPage: React.FunctionComponent = () => {
  const {
    params: { configId, tabId = '' },
  } = useRouteMatch<{ configId: string; tabId?: string }>();
  const agentConfigRequest = useGetOneAgentConfig(configId);
  const agentConfig = agentConfigRequest.data ? agentConfigRequest.data.item : null;
  const { isLoading, error, sendRequest: refreshAgentConfig } = agentConfigRequest;
  const [redirectToAgentConfigList] = useState<boolean>(false);
  const agentStatusRequest = useGetAgentStatus(configId);
  const { refreshAgentStatus } = agentStatusRequest;
  const agentStatus = agentStatusRequest.data?.results;
  const BASE_URI = useLink();
  const URI = useMemo(() => {
    return {
      ADD_DATASOURCE: `${BASE_URI}${AGENT_CONFIG_DETAILS_PATH}${configId}/add-datasource`,
      AGENT_CONFIG_LIST: `${BASE_URI}${AGENT_CONFIG_PATH}`,
      AGENT_CONFIG_DETAILS: `${BASE_URI}${AGENT_CONFIG_DETAILS_PATH}/${configId}`,
      AGENT_CONFIG_DETAILS_YAML: `${BASE_URI}${AGENT_CONFIG_DETAILS_PATH}${generatePath(
        DETAILS_ROUTER_PATH,
        {
          configId,
          tabId: 'yaml',
        }
      )}`,
      AGENT_CONFIG_DETAILS_SETTINGS: `${BASE_URI}${AGENT_CONFIG_DETAILS_PATH}${generatePath(
        DETAILS_ROUTER_PATH,
        {
          configId,
          tabId: 'settings',
        }
      )}`,
    };
  }, [BASE_URI, configId]);

  // Flyout states
  const [isEditConfigFlyoutOpen, setIsEditConfigFlyoutOpen] = useState<boolean>(false);

  const refreshData = useCallback(() => {
    refreshAgentConfig();
    refreshAgentStatus();
  }, [refreshAgentConfig, refreshAgentStatus]);

  const headerLeftContent = useMemo(
    () => (
      <React.Fragment>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <div>
                  <EuiButtonEmpty
                    iconType="arrowLeft"
                    href={URI.AGENT_CONFIG_LIST}
                    flush="left"
                    size="xs"
                  >
                    <FormattedMessage
                      id="xpack.ingestManager.configDetails.viewAgentListTitle"
                      defaultMessage="View all agent configurations"
                    />
                  </EuiButtonEmpty>
                </div>
                <EuiTitle size="l">
                  <h1>
                    {(agentConfig && agentConfig.name) || (
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
            </EuiFlexGroup>
            {agentConfig && agentConfig.description ? (
              <Fragment>
                <EuiSpacer size="s" />
                <EuiText color="subdued" size="s">
                  {agentConfig.description}
                </EuiText>
              </Fragment>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
      </React.Fragment>
    ),
    [URI.AGENT_CONFIG_LIST, agentConfig, configId]
  );

  const headerRightContent = useMemo(
    () => (
      <EuiFlexGroup justifyContent={'flexEnd'} direction="row">
        {[
          {
            label: i18n.translate('xpack.ingestManager.configDetails.summary.revision', {
              defaultMessage: 'Revision',
            }),
            content: '999', // FIXME: implement version - see: https://github.com/elastic/kibana/issues/56750
          },
          {
            label: i18n.translate('xpack.ingestManager.configDetails.summary.datasources', {
              defaultMessage: 'Data sources',
            }),
            content: (
              <EuiI18nNumber
                value={
                  (agentConfig && agentConfig.datasources && agentConfig.datasources.length) || 0
                }
              />
            ),
          },
          {
            label: i18n.translate('xpack.ingestManager.configDetails.summary.usedBy', {
              defaultMessage: 'Used by',
            }),
            content: (
              <LinkedAgentCount
                count={(agentStatus && agentStatus.total) || 0}
                agentConfigId={(agentConfig && agentConfig.id) || ''}
              />
            ),
          },
          {
            label: i18n.translate('xpack.ingestManager.configDetails.summary.lastUpdated', {
              defaultMessage: 'Last updated on',
            }),
            content:
              (agentConfig && (
                <FormattedDate
                  value={agentConfig?.updated_on}
                  year="numeric"
                  month="short"
                  day="2-digit"
                />
              )) ||
              '',
          },
        ].map((item, index) => (
          <EuiFlexItem grow={false} key={index}>
            <EuiStat
              titleSize="xxs"
              textAlign="right"
              title={item.content}
              description={item.label}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    ),
    [agentConfig, agentStatus]
  );

  const headerTabs = useMemo(() => {
    return [
      {
        id: 'datasources',
        name: i18n.translate('xpack.ingestManager.configDetails.subTabs.datasouces', {
          defaultMessage: 'Data sources',
        }),
        href: URI.AGENT_CONFIG_DETAILS,
        isSelected: tabId === '',
      },
      {
        id: 'yaml',
        name: i18n.translate('xpack.ingestManager.configDetails.subTabs.yamlFile', {
          defaultMessage: 'YAML File',
        }),
        href: URI.AGENT_CONFIG_DETAILS_YAML,
        isSelected: tabId === 'yaml',
      },
      {
        id: 'settings',
        name: i18n.translate('xpack.ingestManager.configDetails.subTabs.settings', {
          defaultMessage: 'Settings',
        }),
        href: URI.AGENT_CONFIG_DETAILS_SETTINGS,
        isSelected: tabId === 'settings',
      },
    ];
  }, [
    URI.AGENT_CONFIG_DETAILS,
    URI.AGENT_CONFIG_DETAILS_SETTINGS,
    URI.AGENT_CONFIG_DETAILS_YAML,
    tabId,
  ]);

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
          leftColumn={headerLeftContent}
          rightColumn={headerRightContent}
          tabs={(headerTabs as unknown) as EuiTabProps[]}
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

          {tabId === '' && (
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
                      <EuiButton fill iconType="plusInCircle" href={URI.ADD_DATASOURCE}>
                        <FormattedMessage
                          id="xpack.ingestManager.configDetails.addDatasourceButtonText"
                          defaultMessage="Create data source"
                        />
                      </EuiButton>
                    }
                  />
                ) : null
              }
              search={{
                toolsRight: [
                  <EuiButton iconType="plusInCircle" href={URI.ADD_DATASOURCE}>
                    <FormattedMessage
                      id="xpack.ingestManager.configDetails.addDatasourceButtonText"
                      defaultMessage="Create data source"
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
          )}

          {/* TODO: YAML implementation tracked via https://github.com/elastic/kibana/issues/57958 */}
          {tabId === 'yaml' && <div>YAML placeholder</div>}

          {/* TODO: Settings implementation tracked via: https://github.com/elastic/kibana/issues/57959 */}
          {tabId === 'settings' && <div>Settings placeholder</div>}
        </WithHeaderLayout>
      </AgentStatusRefreshContext.Provider>
    </ConfigRefreshContext.Provider>
  );
};
