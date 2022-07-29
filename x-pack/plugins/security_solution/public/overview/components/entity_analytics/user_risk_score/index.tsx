/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import type { ShapeTreeNode } from '@elastic/charts';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { SeverityFilterGroup } from '../../../../common/components/severity/severity_filter_group';
import { LinkAnchor, LinkButton } from '../../../../common/components/links';

import { useNavigation } from '../../../../common/lib/kibana';
import { useFormatUrl } from '../../../../common/components/link_to';

import { LastUpdatedAt } from '../../detection_response/utils';
import { HeaderSection } from '../../../../common/components/header_section';
import { DonutChart } from '../../../../common/components/charts/donutchart';
import { Legend } from '../../../../common/components/charts/legend';
import type { FillColor } from '../../../../common/components/charts/donutchart';
import { emptyDonutColor } from '../../../../common/components/charts/donutchart_empty';
import { RISK_SEVERITY_COLOUR } from '../../../../common/components/severity/common';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { SecurityPageName } from '../../../../app/types';
import * as i18n from './translations';
import { generateSeverityFilter } from '../../../../hosts/store/helpers';
import { ChartLabel } from '../../detection_response/alerts_by_status/chart_label';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { useQueryToggle } from '../../../../common/containers/query_toggle';

import { usersActions } from '../../../../users/store';
import { getUserRiskScoreColumns } from './columns';
import { useUserRiskScore, useUserRiskScoreKpi } from '../../../../risk_score/containers';
import { UsersTableType } from '../../../../users/store/model';
import { useRiskDonutChart } from '../host_risk_score';
import { getTabsOnUsersUrl } from '../../../../common/components/link_to/redirect_to_users';

const TABLE_QUERY_ID = 'userRiskDashboardTable';
const DONUT_HEIGHT = 120;

const fillColor: FillColor = (d: ShapeTreeNode) => {
  return RISK_SEVERITY_COLOUR[d.dataName as RiskSeverity] ?? emptyDonutColor;
};

const DonutContainer = styled(EuiFlexItem)`
  padding-right: ${({ theme }) => theme.eui.euiSizeXXL};
  padding-left: ${({ theme }) => theme.eui.euiSizeM};
`;

const StyledLegendItems = styled(EuiFlexItem)`
  justify-content: center;
`;

export const EntityAnalyticsUserRiskScores = () => {
  const { deleteQuery, setQuery } = useGlobalTime();
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const { toggleStatus, setToggleStatus } = useQueryToggle(TABLE_QUERY_ID);
  const columns = useMemo(() => getUserRiskScoreColumns(), []);
  const [selectedSeverity, setSelectedSeverity] = useState<RiskSeverity[]>([]);
  const { formatUrl, search } = useFormatUrl(SecurityPageName.users);
  const { navigateTo } = useNavigation();
  const dispatch = useDispatch();

  const severityFilter = useMemo(() => {
    const [filter] = generateSeverityFilter(selectedSeverity);

    return filter ? JSON.stringify(filter.query) : undefined;
  }, [selectedSeverity]);

  const { severityCount, loading: isKpiLoading } = useUserRiskScoreKpi({
    filterQuery: severityFilter,
    skip: !toggleStatus,
  });

  // @ts-expect-error TS2769
  const StyledEuiBasicTable = styled(EuiBasicTable)`
    .euiTableRow {
      .euiTableRowCell {
        border-bottom: none !important;
      }
    }
  `;

  const [isTableLoading, { data, inspect, refetch }] = useUserRiskScore({
    filterQuery: severityFilter,
    skip: !toggleStatus,
    pagination: {
      cursorStart: 0,
      querySize: 5,
    },
  });

  useQueryInspector({
    queryId: TABLE_QUERY_ID,
    loading: isTableLoading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  const [donutChartData, legendItems, total] = useRiskDonutChart(severityCount);

  const goToUserRiskTab = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateTo({
        deepLinkId: SecurityPageName.users,
        path: getTabsOnUsersUrl(UsersTableType.risk, search),
      });

      dispatch(
        usersActions.updateUserRiskScoreSeverityFilter({
          severitySelection: [],
        })
      );
    },
    [navigateTo, search, dispatch]
  );

  useEffect(() => {
    setUpdatedAt(Date.now());
  }, [isTableLoading, isKpiLoading]); // Update the time when data loads

  const userRiskTabUrl = useMemo(
    () => formatUrl(getTabsOnUsersUrl(UsersTableType.risk)),
    [formatUrl]
  );
  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder>
        <HeaderSection
          title={i18n.USER_RISK_TITLE}
          titleSize="s"
          subtitle={
            <LastUpdatedAt isUpdating={isTableLoading || isKpiLoading} updatedAt={updatedAt} />
          }
          headerFilters={
            <SeverityFilterGroup
              selectedSeverities={selectedSeverity}
              severityCount={severityCount}
              title={i18n.USER_RISK}
              onSelect={setSelectedSeverity}
            />
          }
          id={TABLE_QUERY_ID}
          toggleStatus={toggleStatus}
          toggleQuery={setToggleStatus}
        >
          {toggleStatus && (
            <EuiFlexGroup alignItems="center" gutterSize="none">
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
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false}>
                <StyledLegendItems grow={false}>
                  {legendItems.length > 0 && <Legend legendItems={legendItems} />}
                </StyledLegendItems>
                <DonutContainer grow={false} className="eui-textCenter">
                  <DonutChart
                    data={donutChartData ?? null}
                    fillColor={fillColor}
                    height={DONUT_HEIGHT}
                    label={
                      <LinkAnchor
                        data-test-subj="view-total-button"
                        onClick={goToUserRiskTab}
                        href={userRiskTabUrl}
                      >
                        {i18n.TOTAL_LABEL}
                      </LinkAnchor>
                    }
                    title={<ChartLabel count={total} />}
                    totalCount={total}
                  />
                </DonutContainer>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <StyledEuiBasicTable
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
