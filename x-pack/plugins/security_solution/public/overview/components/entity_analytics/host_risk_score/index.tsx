/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiToolTip,
} from '@elastic/eui';

import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { SeverityFilterGroup } from '../../../../common/components/severity/severity_filter_group';
import { LinkButton, useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { getTabsOnHostsUrl } from '../../../../common/components/link_to/redirect_to_hosts';
import { HostsTableType, HostsType } from '../../../../hosts/store/model';
import { getHostRiskScoreColumns } from './columns';
import { LastUpdatedAt } from '../../detection_response/utils';
import { HeaderSection } from '../../../../common/components/header_section';
import { useHostRiskScore, useHostRiskScoreKpi } from '../../../../risk_score/containers';

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
import { useCheckSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_check_signal_index';
import { RiskScoreDonutChart } from '../common/risk_score_donut_chart';
import { BasicTableWithoutBorderBottom } from '../common/basic_table_without_border_bottom';
import { useEnableHostRiskFromUrl } from '../../../../common/hooks/use_enable_host_risk_from_url';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

const TABLE_QUERY_ID = 'hostRiskDashboardTable';

const IconWrapper = styled.span`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

export const EntityAnalyticsHostRiskScores = () => {
  const { deleteQuery, setQuery } = useGlobalTime();
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const { toggleStatus, setToggleStatus } = useQueryToggle(TABLE_QUERY_ID);
  const columns = useMemo(() => getHostRiskScoreColumns(), []);
  const [selectedSeverity, setSelectedSeverity] = useState<RiskSeverity[]>([]);
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const dispatch = useDispatch();
  const riskyHostsFeatureEnabled = useIsExperimentalFeatureEnabled('riskyHostsEnabled');

  const severityFilter = useMemo(() => {
    const [filter] = generateSeverityFilter(selectedSeverity, RiskScoreEntity.host);

    return filter ? JSON.stringify(filter.query) : undefined;
  }, [selectedSeverity]);

  const { severityCount, loading: isKpiLoading } = useHostRiskScoreKpi({
    filterQuery: severityFilter,
    skip: !toggleStatus,
  });

  const [isTableLoading, { data, inspect, refetch, isModuleEnabled }] = useHostRiskScore({
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

  const headerTitle = useMemo(() => {
    return (
      <>
        {i18n.HOST_RISK_TITLE}
        <IconWrapper>
          <EuiIconTip
            color="subdued"
            content={i18n.HOST_RISK_TABLE_TOOLTIP}
            position="right"
            size="l"
            type="iInCircle"
          />
        </IconWrapper>
      </>
    );
  }, []);

  if (!riskyHostsFeatureEnabled) {
    return null;
  }

  if (!isModuleEnabled && !isTableLoading) {
    return <EntityAnalyticsHostRiskScoresDisable />;
  }

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder data-test-subj="entity_analytics_hosts">
        <HeaderSection
          title={headerTitle}
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
          <EuiFlexGroup data-test-subj="entity_analytics_content">
            <EuiFlexItem grow={false}>
              <RiskScoreDonutChart
                severityCount={severityCount}
                onClick={goToHostRiskTab}
                href={hostRiskTabUrl}
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

const EntityAnalyticsHostRiskScoresDisable = () => {
  const loadFromUrl = useEnableHostRiskFromUrl();
  const { signalIndexExists } = useCheckSignalIndex();

  return (
    <EuiPanel hasBorder>
      <HeaderSection title={<h2>{i18n.HOST_RISK_TITLE}</h2>} titleSize="s" />
      <EuiEmptyPrompt
        title={<h2>{i18n.ENABLE_HOST_RISK_SCORE}</h2>}
        body={i18n.ENABLE_HOST_RISK_SCORE_DESCRIPTION}
        actions={
          <EuiToolTip content={!signalIndexExists ? i18n.ENABLE_RISK_SCORE_POPOVER : null}>
            <EuiButton
              color="primary"
              fill
              href={loadFromUrl}
              isDisabled={!signalIndexExists}
              data-test-subj="enable_host_risk_score"
            >
              {i18n.ENABLE_HOST_RISK_SCORE}
            </EuiButton>
          </EuiToolTip>
        }
      />
    </EuiPanel>
  );
};
