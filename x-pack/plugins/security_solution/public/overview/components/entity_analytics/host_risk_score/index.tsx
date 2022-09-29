/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useDispatch } from 'react-redux';
import { RiskScoresDeprecated } from '../../../../common/components/risk_score/risk_score_deprecated';
import { SeverityFilterGroup } from '../../../../common/components/severity/severity_filter_group';
import { LinkButton, useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { getTabsOnHostsUrl } from '../../../../common/components/link_to/redirect_to_hosts';
import { HostsTableType, HostsType } from '../../../../hosts/store/model';
import { getHostRiskScoreColumns } from './columns';
import { LastUpdatedAt } from '../../../../common/components/last_updated_at';
import { HeaderSection } from '../../../../common/components/header_section';
import { useHostRiskScore, useHostRiskScoreKpi } from '../../../../risk_score/containers';

import type { RiskSeverity } from '../../../../../common/search_strategy';
import { EMPTY_SEVERITY_COUNT, RiskScoreEntity } from '../../../../../common/search_strategy';
import { SecurityPageName } from '../../../../app/types';
import * as i18n from './translations';
import { generateSeverityFilter } from '../../../../hosts/store/helpers';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { hostsActions } from '../../../../hosts/store';
import { RiskScoreDonutChart } from '../common/risk_score_donut_chart';
import { BasicTableWithoutBorderBottom } from '../common/basic_table_without_border_bottom';
import { RISKY_HOSTS_DOC_LINK } from '../../../../../common/constants';
import { EntityAnalyticsHostRiskScoreDisable } from '../../../../common/components/risk_score/risk_score_disabled/host_risk_score_disabled';
import { RiskScoreHeaderTitle } from '../../../../common/components/risk_score/risk_score_onboarding/risk_score_header_title';
import { RiskScoresNoDataDetected } from '../../../../common/components/risk_score/risk_score_onboarding/risk_score_no_data_detected';
import { useRefetchQueries } from '../../../../common/hooks/use_refetch_queries';
import { Loader } from '../../../../common/components/loader';
import { Panel } from '../../../../common/components/panel';

const TABLE_QUERY_ID = 'hostRiskDashboardTable';
const HOST_RISK_KPI_QUERY_ID = 'headerHostRiskScoreKpiQuery';

const EntityAnalyticsHostRiskScoresComponent = () => {
  const { deleteQuery, setQuery, from, to } = useGlobalTime();
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const { toggleStatus, setToggleStatus } = useQueryToggle(TABLE_QUERY_ID);
  const columns = useMemo(() => getHostRiskScoreColumns(), []);
  const [selectedSeverity, setSelectedSeverity] = useState<RiskSeverity[]>([]);
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const dispatch = useDispatch();

  const severityFilter = useMemo(() => {
    const [filter] = generateSeverityFilter(selectedSeverity, RiskScoreEntity.host);

    return filter ? JSON.stringify(filter.query) : undefined;
  }, [selectedSeverity]);

  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );

  const {
    severityCount,
    loading: isKpiLoading,
    refetch: refetchKpi,
    inspect: inspectKpi,
  } = useHostRiskScoreKpi({
    filterQuery: severityFilter,
    skip: !toggleStatus,
    timerange,
  });

  useQueryInspector({
    queryId: HOST_RISK_KPI_QUERY_ID,
    loading: isKpiLoading,
    refetch: refetchKpi,
    setQuery,
    deleteQuery,
    inspect: inspectKpi,
  });
  const [
    isTableLoading,
    { data, inspect, refetch, isDeprecated, isLicenseValid, isModuleEnabled },
  ] = useHostRiskScore({
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

  const [goToHostRiskTab, hostRiskTabUrl] = useMemo(() => {
    const { onClick, href } = getSecuritySolutionLinkProps({
      deepLinkId: SecurityPageName.hosts,
      path: getTabsOnHostsUrl(HostsTableType.risk),
      onClick: () => {
        dispatch(
          hostsActions.updateHostRiskScoreSeverityFilter({
            severitySelection: [],
            hostsType: HostsType.page,
          })
        );
      },
    });
    return [onClick, href];
  }, [dispatch, getSecuritySolutionLinkProps]);

  const refreshPage = useRefetchQueries();

  if (!isLicenseValid) {
    return null;
  }

  if (!isModuleEnabled && !isTableLoading) {
    return <EntityAnalyticsHostRiskScoreDisable refetch={refreshPage} timerange={timerange} />;
  }

  if (isDeprecated && !isTableLoading) {
    return (
      <RiskScoresDeprecated
        entityType={RiskScoreEntity.host}
        refetch={refreshPage}
        timerange={timerange}
      />
    );
  }

  if (isModuleEnabled && selectedSeverity.length === 0 && data && data.length === 0) {
    return <RiskScoresNoDataDetected entityType={RiskScoreEntity.host} refetch={refreshPage} />;
  }

  return (
    <InspectButtonContainer>
      <Panel hasBorder data-test-subj="entity_analytics_hosts">
        <HeaderSection
          title={<RiskScoreHeaderTitle riskScoreEntity={RiskScoreEntity.host} />}
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
                  href={RISKY_HOSTS_DOC_LINK}
                  target="_blank"
                >
                  {i18n.LEARN_MORE}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <SeverityFilterGroup
                  selectedSeverities={selectedSeverity}
                  severityCount={severityCount ?? EMPTY_SEVERITY_COUNT}
                  title={i18n.HOST_RISK}
                  onSelect={setSelectedSeverity}
                />
              </EuiFlexItem>
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
          <EuiFlexGroup data-test-subj="entity_analytics_content">
            <EuiFlexItem grow={false}>
              <RiskScoreDonutChart severityCount={severityCount ?? EMPTY_SEVERITY_COUNT} />
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
        {(isTableLoading || isKpiLoading) && (
          <Loader data-test-subj="loadingPanelRiskScore" overlay size="xl" />
        )}
      </Panel>
    </InspectButtonContainer>
  );
};

export const EntityAnalyticsHostRiskScores = React.memo(EntityAnalyticsHostRiskScoresComponent);
EntityAnalyticsHostRiskScores.displayName = 'EntityAnalyticsHostRiskScores';
