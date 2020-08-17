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
import { AgentPolicy, AgentPolicyDetailsDeployAgentAction } from '../../../types';
import { PAGE_ROUTING_PATHS } from '../../../constants';
import { useGetOneAgentPolicy, useLink, useBreadcrumbs, useCore } from '../../../hooks';
import { Loading, Error } from '../../../components';
import { WithHeaderLayout } from '../../../layouts';
import { AgentPolicyRefreshContext, useGetAgentStatus, AgentStatusRefreshContext } from './hooks';
import { LinkedAgentCount, AgentPolicyActionMenu } from '../components';
import { PackagePoliciesView, SettingsView } from './components';
import { useIntraAppState } from '../../../hooks/use_intra_app_state';

const Divider = styled.div`
  width: 0;
  height: 100%;
  border-left: ${(props) => props.theme.eui.euiBorderThin};
`;

export const AgentPolicyDetailsPage: React.FunctionComponent = () => {
  const {
    params: { policyId, tabId = '' },
  } = useRouteMatch<{ policyId: string; tabId?: string }>();
  const history = useHistory();
  const { getHref, getPath } = useLink();
  const agentPolicyRequest = useGetOneAgentPolicy(policyId);
  const agentPolicy = agentPolicyRequest.data ? agentPolicyRequest.data.item : null;
  const { isLoading, error, sendRequest: refreshAgentPolicy } = agentPolicyRequest;
  const [redirectToAgentPolicyList] = useState<boolean>(false);
  const agentStatusRequest = useGetAgentStatus(policyId);
  const { refreshAgentStatus } = agentStatusRequest;
  const {
    application: { navigateToApp },
  } = useCore();
  const routeState = useIntraAppState<AgentPolicyDetailsDeployAgentAction>();
  const agentStatus = agentStatusRequest.data?.results;
  const queryParams = new URLSearchParams(useLocation().search);
  const openEnrollmentFlyoutOpenByDefault = queryParams.get('openEnrollmentFlyout') === 'true';

  const headerLeftContent = useMemo(
    () => (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem>
          <EuiButtonEmpty
            iconType="arrowLeft"
            href={getHref('policies_list')}
            flush="left"
            size="xs"
          >
            <FormattedMessage
              id="xpack.ingestManager.policyDetails.viewAgentListTitle"
              defaultMessage="View all agent policies"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText className="eui-textBreakWord">
            <h1>
              {(agentPolicy && agentPolicy.name) || (
                <FormattedMessage
                  id="xpack.ingestManager.policyDetails.policyDetailsTitle"
                  defaultMessage="Policy '{id}'"
                  values={{
                    id: policyId,
                  }}
                />
              )}
            </h1>
          </EuiText>
        </EuiFlexItem>

        {agentPolicy && agentPolicy.description ? (
          <EuiFlexItem>
            <EuiSpacer size="s" />
            <EuiText color="subdued" size="s" className="eui-textBreakWord">
              {agentPolicy.description}
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    ),
    [getHref, agentPolicy, policyId]
  );

  const enrollmentCancelClickHandler = useCallback(() => {
    if (routeState && routeState.onDoneNavigateTo) {
      navigateToApp(routeState.onDoneNavigateTo[0], routeState.onDoneNavigateTo[1]);
    }
  }, [routeState, navigateToApp]);

  const headerRightContent = useMemo(
    () =>
      agentPolicy ? (
        <EuiFlexGroup justifyContent={'flexEnd'} direction="row">
          {[
            {
              label: i18n.translate('xpack.ingestManager.policyDetails.summary.revision', {
                defaultMessage: 'Revision',
              }),
              content: agentPolicy?.revision ?? 0,
            },
            { isDivider: true },
            {
              label: i18n.translate('xpack.ingestManager.policyDetails.summary.integrations', {
                defaultMessage: 'Integrations',
              }),
              content: (
                <EuiI18nNumber
                  value={
                    (agentPolicy &&
                      agentPolicy.package_policies &&
                      agentPolicy.package_policies.length) ||
                    0
                  }
                />
              ),
            },
            { isDivider: true },
            {
              label: i18n.translate('xpack.ingestManager.policyDetails.summary.usedBy', {
                defaultMessage: 'Used by',
              }),
              content: (
                <LinkedAgentCount
                  count={(agentStatus && agentStatus.total) || 0}
                  agentPolicyId={(agentPolicy && agentPolicy.id) || ''}
                />
              ),
            },
            { isDivider: true },
            {
              label: i18n.translate('xpack.ingestManager.policyDetails.summary.lastUpdated', {
                defaultMessage: 'Last updated on',
              }),
              content:
                (agentPolicy && (
                  <FormattedDate
                    value={agentPolicy?.updated_at}
                    year="numeric"
                    month="short"
                    day="2-digit"
                  />
                )) ||
                '',
            },
            { isDivider: true },
            {
              content: agentPolicy && (
                <AgentPolicyActionMenu
                  agentPolicy={agentPolicy}
                  fullButton={true}
                  onCopySuccess={(newAgentPolicy: AgentPolicy) => {
                    history.push(getPath('policy_details', { policyId: newAgentPolicy.id }));
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
      ) : undefined,
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [agentPolicy, policyId, agentStatus]
  );

  const headerTabs = useMemo(() => {
    return [
      {
        id: 'integrations',
        name: i18n.translate('xpack.ingestManager.policyDetails.subTabs.packagePoliciesTabText', {
          defaultMessage: 'Integrations',
        }),
        href: getHref('policy_details', { policyId, tabId: 'integrations' }),
        isSelected: tabId === '' || tabId === 'integrations',
      },
      {
        id: 'settings',
        name: i18n.translate('xpack.ingestManager.policyDetails.subTabs.settingsTabText', {
          defaultMessage: 'Settings',
        }),
        href: getHref('policy_details', { policyId, tabId: 'settings' }),
        isSelected: tabId === 'settings',
      },
    ];
  }, [getHref, policyId, tabId]);

  const content = useMemo(() => {
    if (redirectToAgentPolicyList) {
      return <Redirect to="/" />;
    }

    if (isLoading) {
      return <Loading />;
    }

    if (error) {
      return (
        <Error
          title={
            <FormattedMessage
              id="xpack.ingestManager.policyDetails.unexceptedErrorTitle"
              defaultMessage="An error happened while loading the agent policy"
            />
          }
          error={error}
        />
      );
    }

    if (!agentPolicy) {
      return (
        <Error
          title={
            <FormattedMessage
              id="xpack.ingestManager.policyDetails.unexceptedErrorTitle"
              defaultMessage="An error happened while loading the agent policy"
            />
          }
          error={i18n.translate('xpack.ingestManager.policyDetails.policyNotFoundErrorTitle', {
            defaultMessage: "Policy '{id}' not found",
            values: {
              id: policyId,
            },
          })}
        />
      );
    }

    return <AgentPolicyDetailsContent agentPolicy={agentPolicy} />;
  }, [agentPolicy, policyId, error, isLoading, redirectToAgentPolicyList]);

  return (
    <AgentPolicyRefreshContext.Provider value={{ refresh: refreshAgentPolicy }}>
      <AgentStatusRefreshContext.Provider value={{ refresh: refreshAgentStatus }}>
        <WithHeaderLayout
          leftColumn={headerLeftContent}
          rightColumn={headerRightContent}
          tabs={(headerTabs as unknown) as EuiTabProps[]}
        >
          {content}
        </WithHeaderLayout>
      </AgentStatusRefreshContext.Provider>
    </AgentPolicyRefreshContext.Provider>
  );
};

const AgentPolicyDetailsContent: React.FunctionComponent<{ agentPolicy: AgentPolicy }> = ({
  agentPolicy,
}) => {
  useBreadcrumbs('policy_details', { policyName: agentPolicy.name });
  return (
    <Switch>
      <Route
        path={PAGE_ROUTING_PATHS.policy_details_settings}
        render={() => {
          return <SettingsView agentPolicy={agentPolicy} />;
        }}
      />
      <Route
        path={PAGE_ROUTING_PATHS.policy_details}
        render={() => {
          return <PackagePoliciesView agentPolicy={agentPolicy} />;
        }}
      />
    </Switch>
  );
};
