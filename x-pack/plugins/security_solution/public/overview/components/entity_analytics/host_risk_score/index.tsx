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
import { sum } from 'lodash/fp';
import { SeverityFilterGroup } from '../../../../common/components/severity/severity_filter_group';
import { LinkAnchor, LinkButton } from '../../../../common/components/links';
import { getTabsOnHostsUrl } from '../../../../common/components/link_to/redirect_to_hosts';
import { HostsTableType } from '../../../../hosts/store/model';
import { useNavigation } from '../../../../common/lib/kibana';
import { useFormatUrl } from '../../../../common/components/link_to';
import { getHostRiskScoreColumns } from './columns';
import { LastUpdatedAt } from '../../detection_response/utils';
import { HeaderSection } from '../../../../common/components/header_section';
import { useHostRiskScore, useHostRiskScoreKpi } from '../../../../risk_score/containers';
import { DonutChart } from '../../../../common/components/charts/donutchart';
import { Legend } from '../../../../common/components/charts/legend';
import type { FillColor, DonutChartProps } from '../../../../common/components/charts/donutchart';
import { emptyDonutColor } from '../../../../common/components/charts/donutchart_empty';
import type { LegendItem } from '../../../../common/components/charts/legend_item';
import { RISK_SEVERITY_COLOUR } from '../../../../common/components/severity/common';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { SecurityPageName } from '../../../../app/types';
import * as i18n from './translations';
import type { SeverityCount } from '../../../../common/components/severity/types';
import { generateSeverityFilter } from '../../../../hosts/store/helpers';
import { ChartLabel } from '../../detection_response/alerts_by_status/chart_label';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { useQueryToggle } from '../../../../common/containers/query_toggle';

const TABLE_QUERY_ID = 'hostRiskDashboardTable';
const DONUT_HEIGHT = 120;

const fillColor: FillColor = (d: ShapeTreeNode) => {
  return RISK_SEVERITY_COLOUR[d.dataName as RiskSeverity] ?? emptyDonutColor;
};

const legendField = 'kibana.alert.severity';

const DonutContainer = styled(EuiFlexItem)`
  padding-right: ${({ theme }) => theme.eui.euiSizeXXL};
  padding-left: ${({ theme }) => theme.eui.euiSizeM};
`;

const StyledLegendItems = styled(EuiFlexItem)`
  justify-content: center;
`;

export const EntityAnalyticsHostRiskScores = () => {
  const { deleteQuery, setQuery } = useGlobalTime();
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const { toggleStatus, setToggleStatus } = useQueryToggle(TABLE_QUERY_ID);
  const columns = useMemo(() => getHostRiskScoreColumns(), []);
  const [selectedSeverity, setSelectedSeverity] = useState<RiskSeverity[]>([]);
  const { formatUrl, search } = useFormatUrl(SecurityPageName.hosts);
  const { navigateTo } = useNavigation();

  const severityFilter = useMemo(() => {
    const [filter] = generateSeverityFilter(selectedSeverity);

    return filter ? JSON.stringify(filter.query) : undefined;
  }, [selectedSeverity]);

  const { severityCount, loading: isKpiLoading } = useHostRiskScoreKpi({
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

  const [isTableLoading, { data, inspect, refetch }] = useHostRiskScore({
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

  const goToHostRiskTab = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateTo({
        deepLinkId: SecurityPageName.hosts,
        path: getTabsOnHostsUrl(HostsTableType.risk, search),
      });
    },
    [navigateTo, search]
  );

  useEffect(() => {
    setUpdatedAt(Date.now());
  }, [isTableLoading, isKpiLoading]); // Update the time when data loads

  const hostRiskTabUrl = formatUrl(getTabsOnHostsUrl(HostsTableType.risk));
  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder>
        <HeaderSection
          title={i18n.HOST_RISK_TITLE}
          titleSize="s"
          subtitle={
            <LastUpdatedAt isUpdating={isTableLoading || isKpiLoading} updatedAt={updatedAt} />
          }
          headerFilters={
            <SeverityFilterGroup
              selectedSeverities={selectedSeverity}
              severityCount={severityCount}
              title={i18n.HOST_RISK}
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
                  onClick={goToHostRiskTab}
                  href={hostRiskTabUrl}
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
                        onClick={goToHostRiskTab}
                        href={hostRiskTabUrl}
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
                // tableCaption="Demo of EuiBasicTable"
                items={data ?? []}
                // rowHeader="firstName"
                columns={columns}
                loading={isTableLoading}
                id={TABLE_QUERY_ID}
                // onChange={() => {}}
                // pagination={{
                //   pageIndex: 0,
                //   pageSize: 5,
                //   totalItemCount: 5,
                //   showPerPageOptions: false,
                // }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPanel>
    </InspectButtonContainer>
  );
};

const useRiskDonutChart = (
  severityCount: SeverityCount
): [DonutChartProps['data'], LegendItem[], number] => {
  const [donutChartData, legendItems, total] = useMemo(() => {
    const severities = Object.keys(RISK_SEVERITY_COLOUR) as RiskSeverity[];

    return [
      severities.map((status) => ({
        key: status,
        value: severityCount[status],
      })),
      severities.map((status) => ({
        color: RISK_SEVERITY_COLOUR[status],
        field: legendField,
        value: status,
      })),
      sum(Object.values(severityCount)),
    ];
  }, [severityCount]);

  return [donutChartData, legendItems, total];
};
