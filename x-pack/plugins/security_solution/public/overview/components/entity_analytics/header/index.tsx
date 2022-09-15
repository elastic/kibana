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
import { sum } from 'lodash/fp';
import { ML_PAGES, useMlHref } from '@kbn/ml-plugin/public';
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
import { useNotableAnomaliesSearch } from '../../../../common/components/ml/anomaly/use_anomalies_search';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useKibana } from '../../../../common/lib/kibana';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';

const StyledEuiTitle = styled(EuiTitle)`
  color: ${({ theme: { eui } }) => eui.euiColorVis9};
`;

export const EntityAnalyticsHeader = () => {
  const { severityCount: hostsSeverityCount } = useHostRiskScoreKpi({});
  const { severityCount: usersSeverityCount } = useUserRiskScoreKpi({});
  const { from, to } = useGlobalTime(false);
  const { data } = useNotableAnomaliesSearch({ skip: false, from, to });
  const dispatch = useDispatch();
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const isPlatinumOrTrialLicense = useMlCapabilities().isPlatinumOrTrialLicense;

  const {
    services: { ml, http },
  } = useKibana();

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
            sort: { field: RiskScoreFields.hostRiskScore, direction: Direction.desc },
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
            sort: { field: RiskScoreFields.userRiskScore, direction: Direction.desc },
            tableType: UsersTableType.risk,
          })
        );
      },
    });
    return [onClick, href];
  }, [dispatch, getSecuritySolutionLinkProps]);

  const totalAnomalies = useMemo(() => sum(data.map(({ count }) => count)), [data]);

  const jobsUrl = useMlHref(ml, http.basePath.get(), {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
  });

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiFlexGroup justifyContent="spaceAround">
        {isPlatinumOrTrialLicense && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem className="eui-textCenter">
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
        {isPlatinumOrTrialLicense && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem className="eui-textCenter">
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

        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem className="eui-textCenter">
              <EuiTitle data-test-subj="anomalies_quantity" size="l">
                <span>{totalAnomalies}</span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <LinkAnchor data-test-subj="all_anomalies_link" href={jobsUrl} target="_blank">
                {i18n.ANOMALIES}
              </LinkAnchor>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
