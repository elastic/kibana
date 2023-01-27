/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle, EuiLink } from '@elastic/eui';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { sumBy } from 'lodash/fp';
import { useRiskScoreKpi } from '../../../../explore/containers/risk_score';
import { LinkAnchor, useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import {
  Direction,
  RiskScoreEntity,
  RiskScoreFields,
  RiskSeverity,
} from '../../../../../common/search_strategy';
import * as i18n from './translations';
import { getTabsOnHostsUrl } from '../../../../common/components/link_to/redirect_to_hosts';
import { SecurityPageName } from '../../../../app/types';
import { HostsTableType, HostsType } from '../../../../explore/hosts/store/model';
import { hostsActions } from '../../../../explore/hosts/store';
import { usersActions } from '../../../../explore/users/store';
import { getTabsOnUsersUrl } from '../../../../common/components/link_to/redirect_to_users';
import { UsersTableType } from '../../../../explore/users/store/model';
import { useNotableAnomaliesSearch } from '../../../../common/components/ml/anomaly/use_anomalies_search';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { ENTITY_ANALYTICS_ANOMALIES_PANEL } from '../anomalies';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import { FormattedCount } from '../../../../common/components/formatted_number';

const StyledEuiTitle = styled(EuiTitle)`
  color: ${({ theme: { eui } }) => eui.euiColorDanger};
`;

const HOST_RISK_QUERY_ID = 'hostRiskScoreKpiQuery';
const USER_RISK_QUERY_ID = 'userRiskScoreKpiQuery';

export const EntityAnalyticsHeader = () => {
  const { from, to } = useGlobalTime(false);
  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );

  const {
    severityCount: hostsSeverityCount,
    loading: hostRiskLoading,
    inspect: inspectHostRiskScore,
    refetch: refetchHostRiskScore,
  } = useRiskScoreKpi({
    timerange,
    riskEntity: RiskScoreEntity.host,
  });

  const {
    severityCount: usersSeverityCount,
    loading: userRiskLoading,
    refetch: refetchUserRiskScore,
    inspect: inspectUserRiskScore,
  } = useRiskScoreKpi({
    timerange,
    riskEntity: RiskScoreEntity.user,
  });

  const { data } = useNotableAnomaliesSearch({ skip: false, from, to });

  const dispatch = useDispatch();
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const isPlatinumOrTrialLicense = useMlCapabilities().isPlatinumOrTrialLicense;

  const [goToHostRiskTabFilteredByCritical, hostRiskTabUrl] = useMemo(() => {
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

  const [goToUserRiskTabFilteredByCritical, userRiskTabUrl] = useMemo(() => {
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

  const { deleteQuery, setQuery } = useGlobalTime();

  useQueryInspector({
    queryId: USER_RISK_QUERY_ID,
    loading: userRiskLoading,
    refetch: refetchUserRiskScore,
    setQuery,
    deleteQuery,
    inspect: inspectUserRiskScore,
  });

  useQueryInspector({
    queryId: HOST_RISK_QUERY_ID,
    loading: hostRiskLoading,
    refetch: refetchHostRiskScore,
    setQuery,
    deleteQuery,
    inspect: inspectHostRiskScore,
  });

  // Anomaly jobs are enabled if at least one job is started or has data
  const areJobsEnabled = useMemo(
    () =>
      data.some(
        ({ job, count }) => count > 0 || (job && isJobStarted(job.jobState, job.datafeedState))
      ),
    [data]
  );

  const totalAnomalies = useMemo(
    () => (areJobsEnabled ? <FormattedCount count={sumBy('count', data)} /> : '-'),
    [data, areJobsEnabled]
  );

  const scrollToAnomalies = useCallback(() => {
    const element = document.querySelector<HTMLElement>(
      `[data-test-subj="${ENTITY_ANALYTICS_ANOMALIES_PANEL}"]`
    );
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiFlexGroup justifyContent="spaceAround" responsive={false}>
        {isPlatinumOrTrialLicense && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
              <EuiFlexItem className="eui-textCenter">
                <StyledEuiTitle data-test-subj="critical_hosts_quantity" size="l">
                  <span>
                    {hostsSeverityCount ? (
                      <FormattedCount count={hostsSeverityCount[RiskSeverity.critical]} />
                    ) : (
                      '-'
                    )}
                  </span>
                </StyledEuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <LinkAnchor
                  onClick={goToHostRiskTabFilteredByCritical}
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
            <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
              <EuiFlexItem className="eui-textCenter">
                <StyledEuiTitle data-test-subj="critical_users_quantity" size="l">
                  <span>
                    {usersSeverityCount ? (
                      <FormattedCount count={usersSeverityCount[RiskSeverity.critical]} />
                    ) : (
                      '-'
                    )}
                  </span>
                </StyledEuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <LinkAnchor
                  onClick={goToUserRiskTabFilteredByCritical}
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
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            <EuiFlexItem className="eui-textCenter">
              <EuiTitle data-test-subj="anomalies_quantity" size="l">
                <span>{totalAnomalies}</span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink data-test-subj="all_anomalies_link" onClick={scrollToAnomalies}>
                {i18n.ANOMALIES}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
