/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useDispatch } from 'react-redux';
import { EnableRiskScore } from '../../../../risk_score/components/enable_risk_score';
import { getTabsOnUsersUrl } from '../../../../common/components/link_to/redirect_to_users';
import { UsersTableType } from '../../../../users/store/model';
import { SeverityFilterGroup } from '../../../../common/components/severity/severity_filter_group';
import { LinkButton, useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { getTabsOnHostsUrl } from '../../../../common/components/link_to/redirect_to_hosts';
import { HostsTableType, HostsType } from '../../../../hosts/store/model';
import { getRiskScoreColumns } from './columns';
import { LastUpdatedAt } from '../../../../common/components/last_updated_at';
import { HeaderSection } from '../../../../common/components/header_section';
import { useRiskScore, useRiskScoreKpi } from '../../../../risk_score/containers';

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
import { StyledBasicTable } from '../common/styled_basic_table';
import { RISKY_HOSTS_DOC_LINK, RISKY_USERS_DOC_LINK } from '../../../../../common/constants';
import { RiskScoreHeaderTitle } from '../../../../risk_score/components/risk_score_onboarding/risk_score_header_title';
import { RiskScoresNoDataDetected } from '../../../../risk_score/components/risk_score_onboarding/risk_score_no_data_detected';
import { useRefetchQueries } from '../../../../common/hooks/use_refetch_queries';
import { Loader } from '../../../../common/components/loader';
import { Panel } from '../../../../common/components/panel';
import * as commonI18n from '../common/translations';
import { usersActions } from '../../../../users/store';
import { useNavigateToTimeline } from '../../detection_response/hooks/use_navigate_to_timeline';
import type { TimeRange } from '../../../../common/store/inputs/model';
import { openAlertsFilter } from '../../detection_response/utils';

const HOST_RISK_TABLE_QUERY_ID = 'hostRiskDashboardTable';
const HOST_RISK_KPI_QUERY_ID = 'headerHostRiskScoreKpiQuery';
const USER_RISK_TABLE_QUERY_ID = 'userRiskDashboardTable';
const USER_RISK_KPI_QUERY_ID = 'headerUserRiskScoreKpiQuery';

const EntityAnalyticsRiskScoresComponent = ({ riskEntity }: { riskEntity: RiskScoreEntity }) => {
  const { deleteQuery, setQuery, from, to } = useGlobalTime();
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const dispatch = useDispatch();

  const entity = useMemo(
    () =>
      riskEntity === RiskScoreEntity.host
        ? {
            docLink: RISKY_HOSTS_DOC_LINK,
            linkProps: {
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
            },
            tableQueryId: HOST_RISK_TABLE_QUERY_ID,
            kpiQueryId: HOST_RISK_KPI_QUERY_ID,
          }
        : {
            docLink: RISKY_USERS_DOC_LINK,
            linkProps: {
              deepLinkId: SecurityPageName.users,
              path: getTabsOnUsersUrl(UsersTableType.risk),
              onClick: () => {
                dispatch(
                  usersActions.updateUserRiskScoreSeverityFilter({
                    severitySelection: [],
                  })
                );
              },
            },
            tableQueryId: USER_RISK_TABLE_QUERY_ID,
            kpiQueryId: USER_RISK_KPI_QUERY_ID,
          },
    [dispatch, riskEntity]
  );

  const { openTimelineWithFilters } = useNavigateToTimeline();

  const openEntityInTimeline = useCallback(
    (entityName: string, oldestAlertTimestamp?: string) => {
      const timeRange: TimeRange | undefined = oldestAlertTimestamp
        ? {
            kind: 'relative',
            from: oldestAlertTimestamp ?? '',
            fromStr: oldestAlertTimestamp ?? '',
            to: new Date().toISOString(),
            toStr: 'now',
          }
        : undefined;

      const filter = {
        field: riskEntity === RiskScoreEntity.host ? 'host.name' : 'user.name',
        value: entityName,
      };
      openTimelineWithFilters([[filter, openAlertsFilter]], timeRange);
    },
    [riskEntity, openTimelineWithFilters]
  );

  const { toggleStatus, setToggleStatus } = useQueryToggle(entity.tableQueryId);
  const columns = useMemo(
    () => getRiskScoreColumns(riskEntity, openEntityInTimeline),
    [riskEntity, openEntityInTimeline]
  );
  const [selectedSeverity, setSelectedSeverity] = useState<RiskSeverity[]>([]);
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();

  const severityFilter = useMemo(() => {
    const [filter] = generateSeverityFilter(selectedSeverity, riskEntity);

    return filter ? JSON.stringify(filter.query) : undefined;
  }, [riskEntity, selectedSeverity]);

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
  } = useRiskScoreKpi({
    filterQuery: severityFilter,
    skip: !toggleStatus,
    timerange,
    riskEntity,
  });

  useQueryInspector({
    queryId: entity.kpiQueryId,
    loading: isKpiLoading,
    refetch: refetchKpi,
    setQuery,
    deleteQuery,
    inspect: inspectKpi,
  });
  const {
    data,
    loading: isTableLoading,
    inspect,
    refetch,
    isDeprecated,
    isLicenseValid,
    isModuleEnabled,
  } = useRiskScore({
    filterQuery: severityFilter,
    skip: !toggleStatus,
    pagination: {
      cursorStart: 0,
      querySize: 5,
    },
    timerange,
    riskEntity,
    includeAlertsCount: true,
  });

  useQueryInspector({
    queryId: entity.tableQueryId,
    loading: isTableLoading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  useEffect(() => {
    setUpdatedAt(Date.now());
  }, [isTableLoading, isKpiLoading]); // Update the time when data loads

  const [goToEntityRiskTab, entityRiskTabUrl] = useMemo(() => {
    const { onClick, href } = getSecuritySolutionLinkProps(entity.linkProps);
    return [onClick, href];
  }, [entity.linkProps, getSecuritySolutionLinkProps]);

  const refreshPage = useRefetchQueries();

  if (!isLicenseValid) {
    return null;
  }

  const status = {
    isDisabled: !isModuleEnabled && !isTableLoading,
    isDeprecated: isDeprecated && !isTableLoading,
  };

  if (status.isDisabled || status.isDeprecated) {
    return (
      <EnableRiskScore
        {...status}
        entityType={riskEntity}
        refetch={refreshPage}
        timerange={timerange}
      />
    );
  }

  if (isModuleEnabled && selectedSeverity.length === 0 && data && data.length === 0) {
    return <RiskScoresNoDataDetected entityType={riskEntity} refetch={refreshPage} />;
  }

  return (
    <InspectButtonContainer>
      <Panel hasBorder data-test-subj={`entity_analytics_${riskEntity}s`}>
        <HeaderSection
          title={<RiskScoreHeaderTitle riskScoreEntity={riskEntity} />}
          titleSize="s"
          subtitle={
            <LastUpdatedAt isUpdating={isTableLoading || isKpiLoading} updatedAt={updatedAt} />
          }
          id={entity.tableQueryId}
          toggleStatus={toggleStatus}
          toggleQuery={setToggleStatus}
          tooltip={commonI18n.HOST_RISK_TABLE_TOOLTIP}
        >
          {toggleStatus && (
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem>
                <EuiButtonEmpty
                  rel="noopener nofollow noreferrer"
                  href={entity.docLink}
                  target="_blank"
                >
                  {i18n.LEARN_MORE}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <SeverityFilterGroup
                  selectedSeverities={selectedSeverity}
                  severityCount={severityCount ?? EMPTY_SEVERITY_COUNT}
                  title={i18n.ENTITY_RISK(riskEntity)}
                  onSelect={setSelectedSeverity}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <LinkButton
                  data-test-subj="view-all-button"
                  onClick={goToEntityRiskTab}
                  href={entityRiskTabUrl}
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
              <StyledBasicTable
                responsive={false}
                items={data ?? []}
                columns={columns}
                loading={isTableLoading}
                id={entity.tableQueryId}
                rowProps={{
                  className: 'EntityAnalyticsTableHoverActions',
                }}
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

export const EntityAnalyticsRiskScores = React.memo(EntityAnalyticsRiskScoresComponent);
EntityAnalyticsRiskScores.displayName = 'EntityAnalyticsRiskScores';
