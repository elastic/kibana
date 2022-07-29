/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { useHostRiskScoreKpi, useUserRiskScoreKpi } from '../../../../risk_score/containers';
import { LinkAnchor } from '../../../../common/components/links';
import { RiskSeverity } from '../../../../../common/search_strategy';
import * as i18n from './translations';
import { getTabsOnHostsUrl } from '../../../../common/components/link_to/redirect_to_hosts';
import { useFormatUrl } from '../../../../common/components/link_to';
import { SecurityPageName } from '../../../../app/types';
import { useNavigation } from '../../../../common/lib/kibana';
import { HostsTableType, HostsType } from '../../../../hosts/store/model';
import { hostsActions } from '../../../../hosts/store';
import { usersActions } from '../../../../users/store';
import { getTabsOnUsersUrl } from '../../../../common/components/link_to/redirect_to_users';
import { UsersTableType } from '../../../../users/store/model';

const StyledEuiTitle = styled(EuiTitle)`
  color: ${({ theme: { eui } }) => eui.euiColorVis9};
`;

export const EntityAnalyticsHeader = () => {
  const { formatUrl, search } = useFormatUrl(SecurityPageName.hosts);
  const { navigateTo } = useNavigation();
  const { severityCount: hostsSeverityCount } = useHostRiskScoreKpi({});
  const { severityCount: usersSeverityCount } = useUserRiskScoreKpi({});
  const dispatch = useDispatch();

  const goToHostRiskTabFilterdByCritical = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateTo({
        deepLinkId: SecurityPageName.hosts,
        path: getTabsOnHostsUrl(HostsTableType.risk, search),
      });

      dispatch(
        hostsActions.updateHostRiskScoreSeverityFilter({
          severitySelection: [RiskSeverity.critical],
          hostsType: HostsType.page,
        })
      );
    },
    [navigateTo, search, dispatch]
  );
  const hostRiskTabUrl = formatUrl(getTabsOnHostsUrl(HostsTableType.risk));

  const goToUserRiskTabFilterdByCritical = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateTo({
        deepLinkId: SecurityPageName.users,
        path: getTabsOnUsersUrl(UsersTableType.risk, search),
      });

      dispatch(
        usersActions.updateUserRiskScoreSeverityFilter({
          severitySelection: [RiskSeverity.critical],
        })
      );
    },
    [navigateTo, search, dispatch]
  );
  const userRiskTabUrl = formatUrl(getTabsOnHostsUrl(HostsTableType.risk));

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <StyledEuiTitle size="l">
                <span>{hostsSeverityCount[RiskSeverity.critical]}</span>
              </StyledEuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <LinkAnchor
                data-test-subj="critical_hosts"
                onClick={goToHostRiskTabFilterdByCritical}
                href={hostRiskTabUrl}
              >
                {i18n.CRITICAL_HOSTS}
              </LinkAnchor>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <StyledEuiTitle size="l">
                <span>{usersSeverityCount[RiskSeverity.critical]}</span>
              </StyledEuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <LinkAnchor
                data-test-subj="critical_users"
                onClick={goToUserRiskTabFilterdByCritical}
                href={userRiskTabUrl}
              >
                {i18n.CRITICAL_USERS}
              </LinkAnchor>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
