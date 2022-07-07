/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import * as i18n from '../translations';

import { useQueryInspector } from '../../../common/components/page/manage_query';
import { RiskScoreOverTime } from '../../../common/components/risk_score_over_time';
import { TopRiskScoreContributors } from '../../../common/components/top_risk_score_contributors';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { UserRiskScoreQueryId, useUserRiskScore } from '../../../risk_score/containers';
import { buildUserNamesFilter } from '../../../../common/search_strategy';
import { UsersComponentsQueryProps } from './types';
import { UserRiskInformationButtonEmpty } from '../../components/user_risk_information';
import { useDashboardButtonHref } from '../../../common/hooks/use_dashboard_button_href';

const QUERY_ID = UserRiskScoreQueryId.USER_DETAILS_RISK_SCORE;

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  margin-top: ${({ theme }) => theme.eui.euiSizeL};
`;

const RISKY_USERS_DASHBOARD_TITLE = 'Current Risk Score For Users';

const UserRiskTabBodyComponent: React.FC<
  Pick<UsersComponentsQueryProps, 'startDate' | 'endDate' | 'setQuery' | 'deleteQuery'> & {
    userName: string;
  }
> = ({ userName, startDate, endDate, setQuery, deleteQuery }) => {
  const { buttonHref } = useDashboardButtonHref({
    to: endDate,
    from: startDate,
    title: RISKY_USERS_DASHBOARD_TITLE,
  });

  const timerange = useMemo(
    () => ({
      from: startDate,
      to: endDate,
    }),
    [startDate, endDate]
  );

  const { toggleStatus: overTimeToggleStatus, setToggleStatus: setOverTimeToggleStatus } =
    useQueryToggle(`${QUERY_ID} overTime`);
  const { toggleStatus: contributorsToggleStatus, setToggleStatus: setContributorsToggleStatus } =
    useQueryToggle(`${QUERY_ID} contributors`);

  const [loading, { data, refetch, inspect }] = useUserRiskScore({
    filterQuery: userName ? buildUserNamesFilter([userName]) : undefined,
    onlyLatest: false,
    skip: !overTimeToggleStatus && !contributorsToggleStatus,
    timerange,
  });

  useQueryInspector({
    queryId: QUERY_ID,
    loading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  const toggleContributorsQuery = useCallback(
    (status: boolean) => {
      setContributorsToggleStatus(status);
    },
    [setContributorsToggleStatus]
  );

  const toggleOverTimeQuery = useCallback(
    (status: boolean) => {
      setOverTimeToggleStatus(status);
    },
    [setOverTimeToggleStatus]
  );

  const rules = data && data.length > 0 ? data[data.length - 1].risk_stats.rule_risks : [];

  return (
    <>
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={2}>
          <RiskScoreOverTime
            from={startDate}
            to={endDate}
            loading={loading}
            riskScore={data}
            queryId={QUERY_ID}
            title={i18n.USER_RISK_SCORE_OVER_TIME}
            toggleStatus={overTimeToggleStatus}
            toggleQuery={toggleOverTimeQuery}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <TopRiskScoreContributors
            loading={loading}
            queryId={QUERY_ID}
            toggleStatus={contributorsToggleStatus}
            toggleQuery={toggleContributorsQuery}
            rules={rules}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <StyledEuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            href={buttonHref}
            isDisabled={!buttonHref}
            data-test-subj="risky-users-view-dashboard-button"
            target="_blank"
          >
            {i18n.VIEW_DASHBOARD_BUTTON}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <UserRiskInformationButtonEmpty />
        </EuiFlexItem>
      </StyledEuiFlexGroup>
    </>
  );
};

UserRiskTabBodyComponent.displayName = 'UserRiskTabBodyComponent';

export const UserRiskTabBody = React.memo(UserRiskTabBodyComponent);

UserRiskTabBody.displayName = 'UserRiskTabBody';
