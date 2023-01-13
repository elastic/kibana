/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { EnableRiskScore } from '../../../../explore/components/risk_score/enable_risk_score';
import { getRiskScoreColumns } from './columns';
import { LastUpdatedAt } from '../../../../common/components/last_updated_at';
import { HeaderSection } from '../../../../common/components/header_section';
import { useRiskScore, useRiskScoreKpi } from '../../../../explore/containers/risk_score';

import type { RiskSeverity } from '../../../../../common/search_strategy';
import { EMPTY_SEVERITY_COUNT, RiskScoreEntity } from '../../../../../common/search_strategy';
import { generateSeverityFilter } from '../../../../explore/hosts/store/helpers';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { RiskScoreDonutChart } from '../common/risk_score_donut_chart';
import { StyledBasicTable } from '../common/styled_basic_table';
import { RiskScoreHeaderTitle } from '../../../../explore/components/risk_score/risk_score_onboarding/risk_score_header_title';
import { RiskScoresNoDataDetected } from '../../../../explore/components/risk_score/risk_score_onboarding/risk_score_no_data_detected';
import { useRefetchQueries } from '../../../../common/hooks/use_refetch_queries';
import { Loader } from '../../../../common/components/loader';
import { Panel } from '../../../../common/components/panel';
import * as commonI18n from '../common/translations';
import { useNavigateToTimeline } from '../../detection_response/hooks/use_navigate_to_timeline';
import type { TimeRange } from '../../../../common/store/inputs/model';
import { openAlertsFilter } from '../../detection_response/utils';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { getRiskScoreDonutAttributes } from '../../../../common/components/visualization_actions/lens_attributes/common/risk_scores/risk_score_donut';
import { TOTAL_LABEL } from '../common/translations';
import { useEntityInfo } from './use_entity';
import { RiskScoreHeaderContent } from './header_content';

const EntityAnalyticsRiskScoresComponent = ({ riskEntity }: { riskEntity: RiskScoreEntity }) => {
  const { deleteQuery, setQuery, from, to } = useGlobalTime();
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const spaceId = useSpaceId();
  const extraOptions = useMemo(() => ({ spaceId }), [spaceId]);
  const entity = useEntityInfo(riskEntity);

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

  const onSelectSeverityFilterGroup = useCallback((newSelection: RiskSeverity[]) => {
    setSelectedSeverity(newSelection);
  }, []);

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
  const isChartEmbeddablesEnabled = useIsExperimentalFeatureEnabled('chartEmbeddablesEnabled');

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
          <RiskScoreHeaderContent
            entityDocLink={entity.docLink}
            entityLinkProps={entity.linkProps}
            onSelectSeverityFilterGroup={onSelectSeverityFilterGroup}
            riskEntity={riskEntity}
            selectedSeverity={selectedSeverity}
            severityCount={severityCount}
            toggleStatus={toggleStatus}
          />
        </HeaderSection>
        {toggleStatus && (
          <EuiFlexGroup data-test-subj="entity_analytics_content">
            <EuiFlexItem grow={false}>
              {isChartEmbeddablesEnabled && spaceId && data && data.length ? (
                <VisualizationEmbeddable
                  extraOptions={extraOptions}
                  getLensAttributes={getRiskScoreDonutAttributes}
                  height="120px"
                  id={`${entity.kpiQueryId}-donut`}
                  isDonut={true}
                  label={TOTAL_LABEL}
                  stackByField={riskEntity}
                  timerange={timerange}
                />
              ) : (
                <RiskScoreDonutChart severityCount={severityCount ?? EMPTY_SEVERITY_COUNT} />
              )}
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
