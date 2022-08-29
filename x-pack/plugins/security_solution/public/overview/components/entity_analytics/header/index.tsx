/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { useHostRiskScoreKpi, useUserRiskScoreKpi } from '../../../../risk_score/containers';
import { LinkAnchor, useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { Direction, RiskScoreFields, RiskSeverity } from '../../../../../common/search_strategy';
import * as i18n from './translations';
import { getTabsOnHostsUrl } from '../../../../common/components/link_to/redirect_to_hosts';
import { SecurityPageName } from '../../../../app/types';
import { HostsTableType, HostsType } from '../../../../hosts/store/model';
import { hostsActions } from '../../../../hosts/store';
import { usersActions } from '../../../../users/store';
import { getTabsOnUsersUrl } from '../../../../common/components/link_to/redirect_to_users';
import { UsersTableType } from '../../../../users/store/model';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

const StyledEuiTitle = styled(EuiTitle)`
  color: ${({ theme: { eui } }) => eui.euiColorVis9};
`;

export const EntityAnalyticsHeader = () => {
  const { severityCount: hostsSeverityCount } = useHostRiskScoreKpi({});
  const { severityCount: usersSeverityCount } = useUserRiskScoreKpi({});
  const dispatch = useDispatch();
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const riskyUsersFeatureEnabled = useIsExperimentalFeatureEnabled('riskyUsersEnabled');
  const riskyHostsFeatureEnabled = useIsExperimentalFeatureEnabled('riskyHostsEnabled');

  const [goToHostRiskTabFilterdByCritical, hostRiskTabUrl] = useMemo(() => {
    const { onClick, href } = getSecuritySolutionLinkProps({
      deepLinkId: SecurityPageName.hosts,
      path: getTabsOnHostsUrl(HostsTableType.risk),
      onClick: () => {
        dispatch(
          hostsActions.updateHostRiskScoreSeverityFilter({
            severitySelection: [RiskSeverity.critical],
            hostsType: HostsType.page,
          })
        );

        dispatch(
          hostsActions.updateHostRiskScoreSort({
            sort: { field: RiskScoreFields.riskScore, direction: Direction.desc },
            hostsType: HostsType.page,
          })
        );
      },
    });
    return [onClick, href];
  }, [dispatch, getSecuritySolutionLinkProps]);

  const [goToUserRiskTabFilterdByCritical, userRiskTabUrl] = useMemo(() => {
    const { onClick, href } = getSecuritySolutionLinkProps({
      deepLinkId: SecurityPageName.users,
      path: getTabsOnUsersUrl(UsersTableType.risk),
      onClick: () => {
        dispatch(
          usersActions.updateUserRiskScoreSeverityFilter({
            severitySelection: [RiskSeverity.critical],
          })
        );

        dispatch(
          usersActions.updateTableSorting({
            sort: { field: RiskScoreFields.riskScore, direction: Direction.desc },
            tableType: UsersTableType.risk,
          })
        );
      },
    });
    return [onClick, href];
  }, [dispatch, getSecuritySolutionLinkProps]);

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiFlexGroup>
        {riskyHostsFeatureEnabled && (
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <StyledEuiTitle data-test-subj="critical_hosts_quantity" size="l">
                  <span>{hostsSeverityCount[RiskSeverity.critical]}</span>
                </StyledEuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <LinkAnchor
                  onClick={goToHostRiskTabFilterdByCritical}
                  href={hostRiskTabUrl}
                  data-test-subj="critical_hosts_link"
                >
                  {i18n.CRITICAL_HOSTS}
                </LinkAnchor>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
        {riskyUsersFeatureEnabled && (
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <StyledEuiTitle data-test-subj="critical_users_quantity" size="l">
                  <span>{usersSeverityCount[RiskSeverity.critical]}</span>
                </StyledEuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <LinkAnchor
                  onClick={goToUserRiskTabFilterdByCritical}
                  href={userRiskTabUrl}
                  data-test-subj="critical_users_link"
                >
                  {i18n.CRITICAL_USERS}
                </LinkAnchor>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
