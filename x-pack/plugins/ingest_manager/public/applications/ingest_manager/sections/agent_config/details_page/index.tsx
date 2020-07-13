/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { Redirect, useRouteMatch, Switch, Route, useHistory, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedDate } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiI18nNumber,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import styled from 'styled-components';
import { AgentConfig, AgentConfigDetailsDeployAgentAction } from '../../../types';
import { PAGE_ROUTING_PATHS } from '../../../constants';
import { useGetOneAgentConfig, useLink, useBreadcrumbs, useCore } from '../../../hooks';
import { Loading } from '../../../components';
import { WithHeaderLayout } from '../../../layouts';
import { ConfigRefreshContext, useGetAgentStatus, AgentStatusRefreshContext } from './hooks';
import { LinkedAgentCount, AgentConfigActionMenu } from '../components';
import { ConfigPackageConfigsView, ConfigSettingsView } from './components';
import { useIntraAppState } from '../../../hooks/use_intra_app_state';

const Divider = styled.div`
  width: 0;
  height: 100%;
  border-left: ${(props) => props.theme.eui.euiBorderThin};
`;

export const AgentConfigDetailsPage: React.FunctionComponent = () => {
  const {
    params: { configId, tabId = '' },
  } = useRouteMatch<{ configId: string; tabId?: string }>();
  const history = useHistory();
  const { getHref, getPath } = useLink();
  const agentConfigRequest = useGetOneAgentConfig(configId);
  const agentConfig = agentConfigRequest.data ? agentConfigRequest.data.item : null;
  const { isLoading, error, sendRequest: refreshAgentConfig } = agentConfigRequest;
  const [redirectToAgentConfigList] = useState<boolean>(false);
  const agentStatusRequest = useGetAgentStatus(configId);
  const { refreshAgentStatus } = agentStatusRequest;
  const {
    application: { navigateToApp },
  } = useCore();
  const routeState = useIntraAppState<AgentConfigDetailsDeployAgentAction>();
  const agentStatus = agentStatusRequest.data?.results;
  const queryParams = new URLSearchParams(useLocation().search);
  const openEnrollmentFlyoutOpenByDefault = queryParams.get('openEnrollmentFlyout') === 'true';

  const headerLeftContent = useMemo(
    () => (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem>
          <EuiButtonEmpty
            iconType="arrowLeft"
            href={getHref('configurations_list')}
            flush="left"
            size="xs"
          >
            <FormattedMessage
              id="xpack.ingestManager.configDetails.viewAgentListTitle"
              defaultMessage="View all agent configurations"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
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
          </EuiText>
        </EuiFlexItem>

        {agentConfig && agentConfig.description ? (
          <EuiFlexItem>
            <EuiSpacer size="s" />
            <EuiText color="subdued" size="s">
              {agentConfig.description}
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    ),
    [getHref, agentConfig, configId]
  );

  const enrollmentCancelClickHandler = useCallback(() => {
    if (routeState && routeState.onDoneNavigateTo) {
      navigateToApp(routeState.onDoneNavigateTo[0], routeState.onDoneNavigateTo[1]);
    }
  }, [routeState, navigateToApp]);

  const headerRightContent = useMemo(
    () => (
      <EuiFlexGroup justifyContent={'flexEnd'} direction="row">
        {[
          {
            label: i18n.translate('xpack.ingestManager.configDetails.summary.revision', {
              defaultMessage: 'Revision',
            }),
            content: agentConfig?.revision ?? 0,
          },
          { isDivider: true },
          {
            label: i18n.translate('xpack.ingestManager.configDetails.summary.package_configs', {
              defaultMessage: 'Integrations',
            }),
            content: (
              <EuiI18nNumber
                value={
                  (agentConfig &&
                    agentConfig.package_configs &&
                    agentConfig.package_configs.length) ||
                  0
                }
              />
            ),
          },
          { isDivider: true },
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
          { isDivider: true },
          {
            label: i18n.translate('xpack.ingestManager.configDetails.summary.lastUpdated', {
              defaultMessage: 'Last updated on',
            }),
            content:
              (agentConfig && (
                <FormattedDate
                  value={agentConfig?.updated_at}
                  year="numeric"
                  month="short"
                  day="2-digit"
                />
              )) ||
              '',
          },
          { isDivider: true },
          {
            content: agentConfig && (
              <AgentConfigActionMenu
                config={agentConfig}
                fullButton={true}
                onCopySuccess={(newAgentConfig: AgentConfig) => {
                  history.push(getPath('configuration_details', { configId: newAgentConfig.id }));
                }}
                enrollmentFlyoutOpenByDefault={openEnrollmentFlyoutOpenByDefault}
                onCancelEnrollment={
                  routeState && routeState.onDoneNavigateTo
                    ? enrollmentCancelClickHandler
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
                <EuiDescriptionListTitle className="eui-textNoWrap">
                  {item.label}
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription className="eui-textNoWrap">
                  {item.content}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            ) : (
              item.content
            )}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    ),
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [agentConfig, configId, agentStatus]
  );

  const headerTabs = useMemo(() => {
    return [
      {
        id: 'integrations',
        name: i18n.translate('xpack.ingestManager.configDetails.subTabs.packageConfigsTabText', {
          defaultMessage: 'Integrations',
        }),
        href: getHref('configuration_details', { configId, tabId: 'integrations' }),
        isSelected: tabId === '' || tabId === 'integrations',
      },
      {
        id: 'settings',
        name: i18n.translate('xpack.ingestManager.configDetails.subTabs.settingsTabText', {
          defaultMessage: 'Settings',
        }),
        href: getHref('configuration_details', { configId, tabId: 'settings' }),
        isSelected: tabId === 'settings',
      },
    ];
  }, [getHref, configId, tabId]);

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
          <AgentConfigDetailsContent agentConfig={agentConfig} />
        </WithHeaderLayout>
      </AgentStatusRefreshContext.Provider>
    </ConfigRefreshContext.Provider>
  );
};

const AgentConfigDetailsContent: React.FunctionComponent<{ agentConfig: AgentConfig }> = ({
  agentConfig,
}) => {
  useBreadcrumbs('configuration_details', { configName: agentConfig.name });
  return (
    <Switch>
      <Route
        path={PAGE_ROUTING_PATHS.configuration_details_settings}
        render={() => {
          return <ConfigSettingsView config={agentConfig} />;
        }}
      />
      <Route
        path={PAGE_ROUTING_PATHS.configuration_details}
        render={() => {
          return <ConfigPackageConfigsView config={agentConfig} />;
        }}
      />
    </Switch>
  );
};
