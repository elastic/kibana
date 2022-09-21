/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';

import { useDispatch } from 'react-redux';
import { EntityAnalyticsUserRiskScoreDisable } from '../../../../common/components/risk_score/risk_score_disabled/user_risk_score.disabled';
import { getTabsOnUsersUrl } from '../../../../common/components/link_to/redirect_to_users';
import { UsersTableType } from '../../../../users/store/model';
import { RiskScoresDeprecated } from '../../../../common/components/risk_score/risk_score_deprecated';
import { SeverityFilterGroup } from '../../../../common/components/severity/severity_filter_group';
import { LinkButton, useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { getTabsOnHostsUrl } from '../../../../common/components/link_to/redirect_to_hosts';
import { HostsTableType, HostsType } from '../../../../hosts/store/model';
import { getRiskScoreColumns } from './columns';
import { LastUpdatedAt } from '../../../../common/components/last_updated_at';
import { HeaderSection } from '../../../../common/components/header_section';
import {
  useHostRiskScore,
  useHostRiskScoreKpi,
  useUserRiskScore,
  useUserRiskScoreKpi,
} from '../../../../risk_score/containers';

import type { RiskSeverity } from '../../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
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
import {
  RISKY_HOSTS_EXTERNAL_DOC_LINK,
  RISKY_USERS_EXTERNAL_DOC_LINK,
} from '../../../../../common/constants';
import { EntityAnalyticsHostRiskScoreDisable } from '../../../../common/components/risk_score/risk_score_disabled/host_risk_score_disabled';
import { RiskScoreHeaderTitle } from '../../../../common/components/risk_score/risk_score_onboarding/risk_score_header_title';
import { RiskScoresNoDataDetected } from '../../../../common/components/risk_score/risk_score_onboarding/risk_score_no_data_detected';
import { usersActions } from '../../../../users/store';

const TABLE_QUERY_ID = (riskEntity: RiskScoreEntity) =>
  riskEntity === RiskScoreEntity.host ? 'hostRiskDashboardTable' : 'userRiskDashboardTable';

const EntityAnalyticsRiskScoresComponent = ({ riskEntity }: { riskEntity: RiskScoreEntity }) => {
  const { deleteQuery, setQuery, from, to } = useGlobalTime();
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const dispatch = useDispatch();

  const entity = useMemo(
    () =>
      riskEntity === RiskScoreEntity.host
        ? {
            docLink: RISKY_HOSTS_EXTERNAL_DOC_LINK,
            kpiHook: useHostRiskScoreKpi,
            riskScoreHook: useHostRiskScore,
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
          }
        : {
            docLink: RISKY_USERS_EXTERNAL_DOC_LINK,
            kpiHook: useUserRiskScoreKpi,
            riskScoreHook: useUserRiskScore,
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
          },
    [dispatch, riskEntity]
  );

  const { toggleStatus, setToggleStatus } = useQueryToggle(TABLE_QUERY_ID(riskEntity));
  const columns = useMemo(() => getRiskScoreColumns(riskEntity), [riskEntity]);
  const [selectedSeverity, setSelectedSeverity] = useState<RiskSeverity[]>([]);
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();

  const severityFilter = useMemo(() => {
    const [filter] = generateSeverityFilter(selectedSeverity, riskEntity);

    return filter ? JSON.stringify(filter.query) : undefined;
  }, [riskEntity, selectedSeverity]);

  const { severityCount, loading: isKpiLoading } = entity.kpiHook({
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
    { data, inspect, refetch, isDeprecated, isLicenseValid, isModuleEnabled },
  ] = entity.riskScoreHook({
    filterQuery: severityFilter,
    skip: !toggleStatus,
    pagination: {
      cursorStart: 0,
      querySize: 5,
    },
    timerange,
  });

  useQueryInspector({
    queryId: TABLE_QUERY_ID(riskEntity),
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

  if (!isLicenseValid) {
    return null;
  }

  if (!isModuleEnabled) {
    return riskEntity === RiskScoreEntity.host ? (
      <EntityAnalyticsHostRiskScoreDisable refetch={refetch} timerange={timerange} />
    ) : (
      <EntityAnalyticsUserRiskScoreDisable refetch={refetch} timerange={timerange} />
    );
  }

  if (isDeprecated) {
    return <RiskScoresDeprecated entityType={riskEntity} refetch={refetch} timerange={timerange} />;
  }

  if (isModuleEnabled && selectedSeverity.length === 0 && data && data.length === 0) {
    return <RiskScoresNoDataDetected entityType={riskEntity} />;
  }

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder data-test-subj={`entity_analytics_${riskEntity}s`}>
        <HeaderSection
          title={<RiskScoreHeaderTitle riskScoreEntity={riskEntity} />}
          titleSize="s"
          subtitle={
            <LastUpdatedAt isUpdating={isTableLoading || isKpiLoading} updatedAt={updatedAt} />
          }
          id={TABLE_QUERY_ID(riskEntity)}
          toggleStatus={toggleStatus}
          toggleQuery={setToggleStatus}
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
                  severityCount={severityCount}
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
              <RiskScoreDonutChart
                severityCount={severityCount}
                onClick={goToEntityRiskTab}
                href={entityRiskTabUrl}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <BasicTableWithoutBorderBottom
                responsive={false}
                items={data ?? []}
                columns={columns}
                loading={isTableLoading}
                id={TABLE_QUERY_ID(riskEntity)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPanel>
    </InspectButtonContainer>
  );
};

export const EntityAnalyticsRiskScores = React.memo(EntityAnalyticsRiskScoresComponent);
EntityAnalyticsRiskScores.displayName = 'EntityAnalyticsRiskScores';
