/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { Redirect, useRouteMatch, Switch, Route, useHistory, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedDate } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiI18nNumber,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import type { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import styled from 'styled-components';

import type { AgentPolicy, AgentPolicyDetailsDeployAgentAction } from '../../../types';
import { FLEET_ROUTING_PATHS } from '../../../constants';
import {
  AgentPolicyRefreshContext,
  useGetOneAgentPolicy,
  useLink,
  useBreadcrumbs,
  useStartServices,
  useFleetStatus,
  useIntraAppState,
} from '../../../hooks';
import { Loading, Error } from '../../../components';
import { WithHeaderLayout } from '../../../layouts';
import { LinkedAgentCount, AgentPolicyActionMenu } from '../components';

import { useGetAgentStatus, AgentStatusRefreshContext } from './hooks';
import { PackagePoliciesView, SettingsView } from './components';

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
  } = useStartServices();
  const routeState = useIntraAppState<AgentPolicyDetailsDeployAgentAction>();
  const agentStatus = agentStatusRequest.data?.results;
  const queryParams = new URLSearchParams(useLocation().search);
  const openEnrollmentFlyoutOpenByDefault = queryParams.get('openEnrollmentFlyout') === 'true';
  const { isReady: isFleetReady } = useFleetStatus();

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
              id="xpack.fleet.policyDetails.viewAgentListTitle"
              defaultMessage="View all agent policies"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          {isLoading ? (
            <Loading />
          ) : (
            <EuiFlexGroup alignItems="center" wrap responsive={false} gutterSize="s">
              <EuiFlexItem>
                <EuiTitle>
                  <h1>
                    {(agentPolicy && agentPolicy.name) || (
                      <FormattedMessage
                        id="xpack.fleet.policyDetails.policyDetailsTitle"
                        defaultMessage="Policy '{id}'"
                        values={{ id: policyId }}
                      />
                    )}
                  </h1>
                </EuiTitle>
              </EuiFlexItem>
              {agentPolicy?.is_managed && (
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    title="Hosted agent policy"
                    content={i18n.translate(
                      'xpack.fleet.policyDetails.policyDetailsHostedPolicyTooltip',
                      {
                        defaultMessage:
                          'This policy is managed outside of Fleet. Most actions related to this policy are unavailable.',
                      }
                    )}
                    type="lock"
                    size="l"
                    color="subdued"
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          )}
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
    [getHref, isLoading, agentPolicy, policyId]
  );

  const headerRightContent = useMemo(
    () =>
      agentPolicy ? (
        <EuiFlexGroup justifyContent={'flexEnd'} direction="row">
          {[
            {
              label: i18n.translate('xpack.fleet.policyDetails.summary.revision', {
                defaultMessage: 'Revision',
              }),
              content: agentPolicy?.revision ?? 0,
            },
            { isDivider: true },
            {
              label: i18n.translate('xpack.fleet.policyDetails.summary.integrations', {
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
              label: i18n.translate('xpack.fleet.policyDetails.summary.usedBy', {
                defaultMessage: 'Used by',
              }),
              content: (
                <LinkedAgentCount
                  count={(agentStatus && agentStatus.total) || 0}
                  agentPolicyId={(agentPolicy && agentPolicy.id) || ''}
                  showAgentText
                />
              ),
            },
            { isDivider: true },
            {
              label: i18n.translate('xpack.fleet.policyDetails.summary.lastUpdated', {
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
                    routeState && routeState.onDoneNavigateTo && isFleetReady
                      ? () =>
                          navigateToApp(
                            routeState.onDoneNavigateTo![0],
                            routeState.onDoneNavigateTo![1]
                          )
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
        name: i18n.translate('xpack.fleet.policyDetails.subTabs.packagePoliciesTabText', {
          defaultMessage: 'Integrations',
        }),
        href: getHref('policy_details', { policyId, tabId: 'integrations' }),
        isSelected: tabId === '' || tabId === 'integrations',
      },
      {
        id: 'settings',
        name: i18n.translate('xpack.fleet.policyDetails.subTabs.settingsTabText', {
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
              id="xpack.fleet.policyDetails.unexceptedErrorTitle"
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
              id="xpack.fleet.policyDetails.unexceptedErrorTitle"
              defaultMessage="An error happened while loading the agent policy"
            />
          }
          error={i18n.translate('xpack.fleet.policyDetails.policyNotFoundErrorTitle', {
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
        path={FLEET_ROUTING_PATHS.policy_details_settings}
        render={() => {
          return <SettingsView agentPolicy={agentPolicy} />;
        }}
      />
      <Route
        path={FLEET_ROUTING_PATHS.policy_details}
        render={() => {
          return <PackagePoliciesView agentPolicy={agentPolicy} />;
        }}
      />
    </Switch>
  );
};
