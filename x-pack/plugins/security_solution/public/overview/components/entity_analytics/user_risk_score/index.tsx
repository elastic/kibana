/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiPanel } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { RiskScoresDeprecated } from '../../../../common/components/risk_score/risk_score_deprecated';
import { SeverityFilterGroup } from '../../../../common/components/severity/severity_filter_group';
import { LinkButton, useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { LastUpdatedAt } from '../../detection_response/utils';
import { HeaderSection } from '../../../../common/components/header_section';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { SecurityPageName } from '../../../../app/types';
import * as i18n from './translations';
import { generateSeverityFilter } from '../../../../hosts/store/helpers';

import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { usersActions } from '../../../../users/store';
import { getUserRiskScoreColumns } from './columns';
import { useUserRiskScore, useUserRiskScoreKpi } from '../../../../risk_score/containers';
import { UsersTableType } from '../../../../users/store/model';
import { getTabsOnUsersUrl } from '../../../../common/components/link_to/redirect_to_users';
import { RiskScoreDonutChart } from '../common/risk_score_donut_chart';
import { BasicTableWithoutBorderBottom } from '../common/basic_table_without_border_bottom';

import { RISKY_USERS_EXTERNAL_DOC_LINK } from '../../../../../common/constants';
import { EntityAnalyticsUserRiskScoreDisable } from '../../../../common/components/risk_score/risk_score_disabled/user_risk_score.disabled';

const TABLE_QUERY_ID = 'userRiskDashboardTable';

const IconWrapper = styled.span`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

const EntityAnalyticsUserRiskScoresComponent = () => {
  const { deleteQuery, setQuery, from, to } = useGlobalTime();
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const { toggleStatus, setToggleStatus } = useQueryToggle(TABLE_QUERY_ID);
  const columns = useMemo(() => getUserRiskScoreColumns(), []);
  const [selectedSeverity, setSelectedSeverity] = useState<RiskSeverity[]>([]);
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const dispatch = useDispatch();

  const severityFilter = useMemo(() => {
    const [filter] = generateSeverityFilter(selectedSeverity, RiskScoreEntity.user);

    return filter ? JSON.stringify(filter.query) : undefined;
  }, [selectedSeverity]);

  const { severityCount, loading: isKpiLoading } = useUserRiskScoreKpi({
    filterQuery: severityFilter,
    skip: !toggleStatus,
  });

  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );

  const [
    isTableLoading,
    { data, inspect, refetch, isLicenseValid, isDeprecated, isModuleEnabled },
  ] = useUserRiskScore({
    filterQuery: severityFilter,
    skip: !toggleStatus,
    pagination: {
      cursorStart: 0,
      querySize: 5,
    },
    timerange,
  });

  useQueryInspector({
    queryId: TABLE_QUERY_ID,
    loading: isTableLoading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  useEffect(() => {
    setUpdatedAt(Date.now());
  }, [isTableLoading, isKpiLoading]); // Update the time when data loads

  const [goToUserRiskTab, userRiskTabUrl] = useMemo(() => {
    const { onClick, href } = getSecuritySolutionLinkProps({
      deepLinkId: SecurityPageName.users,
      path: getTabsOnUsersUrl(UsersTableType.risk),
      onClick: () => {
        dispatch(
          usersActions.updateUserRiskScoreSeverityFilter({
            severitySelection: [],
          })
        );
      },
    });
    return [onClick, href];
  }, [dispatch, getSecuritySolutionLinkProps]);

  const headerTitle = useMemo(() => {
    return (
      <>
        {i18n.USER_RISK_TITLE}
        <IconWrapper>
          <EuiIconTip
            color="subdued"
            content={i18n.USER_RISK_TABLE_TOOLTIP}
            position="right"
            size="l"
            type="iInCircle"
          />
        </IconWrapper>
      </>
    );
  }, []);

  if (!isLicenseValid) {
    return null;
  }

  if (!isModuleEnabled && !isTableLoading) {
    return <EntityAnalyticsUserRiskScoreDisable refetch={refetch} timerange={timerange} />;
  }

  if (isDeprecated) {
    return (
      <RiskScoresDeprecated
        entityType={RiskScoreEntity.user}
        refetch={refetch}
        timerange={timerange}
      />
    );
  }

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder data-test-subj="entity_analytics_users">
        <HeaderSection
          title={headerTitle}
          titleSize="s"
          subtitle={
            <LastUpdatedAt isUpdating={isTableLoading || isKpiLoading} updatedAt={updatedAt} />
          }
          id={TABLE_QUERY_ID}
          toggleStatus={toggleStatus}
          toggleQuery={setToggleStatus}
        >
          {toggleStatus && (
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem>
                <EuiButtonEmpty
                  rel="noopener nofollow noreferrer"
                  href={RISKY_USERS_EXTERNAL_DOC_LINK}
                  target="_blank"
                >
                  {i18n.LEARN_MORE}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <SeverityFilterGroup
                  selectedSeverities={selectedSeverity}
                  severityCount={severityCount}
                  title={i18n.USER_RISK}
                  onSelect={setSelectedSeverity}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <LinkButton
                  data-test-subj="view-all-button"
                  onClick={goToUserRiskTab}
                  href={userRiskTabUrl}
                >
                  {i18n.VIEW_ALL}
                </LinkButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </HeaderSection>
        {toggleStatus && (
          <EuiFlexGroup data-test-subj="entity_analytics_content">
            <EuiFlexItem grow={false}>
              <RiskScoreDonutChart
                severityCount={severityCount}
                onClick={goToUserRiskTab}
                href={userRiskTabUrl}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <BasicTableWithoutBorderBottom
                responsive={false}
                items={data ?? []}
                columns={columns}
                loading={isTableLoading}
                id={TABLE_QUERY_ID}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPanel>
    </InspectButtonContainer>
  );
};

export const EntityAnalyticsUserRiskScores = React.memo(EntityAnalyticsUserRiskScoresComponent);
EntityAnalyticsUserRiskScores.displayName = 'EntityAnalyticsUserRiskScores';
