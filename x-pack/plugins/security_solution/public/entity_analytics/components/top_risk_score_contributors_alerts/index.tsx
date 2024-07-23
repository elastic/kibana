/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { TableId } from '@kbn/securitysolution-data-table';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';

import { HeaderSection } from '../../../common/components/header_section';

import * as i18n from './translations';
import type { RiskInputs } from '../../../../common/entity_analytics/risk_engine';
import { RiskScoreEntity } from '../../../../common/entity_analytics/risk_engine';
import type { HostRiskScore, UserRiskScore } from '../../../../common/search_strategy';
import { ALERTS_TABLE_REGISTRY_CONFIG_IDS } from '../../../../common/constants';
import { AlertsTableComponent } from '../../../detections/components/alerts_table';
import { GroupedAlertsTable } from '../../../detections/components/alerts_table/alerts_grouping';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../common/store/inputs';
import { useUserData } from '../../../detections/components/user_info';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { RiskInformationButtonEmpty } from '../risk_information';

export interface TopRiskScoreContributorsAlertsProps {
  toggleStatus: boolean;
  toggleQuery?: (status: boolean) => void;
  riskScore: HostRiskScore | UserRiskScore;
  riskEntity: RiskScoreEntity;
  loading: boolean;
}

export const TopRiskScoreContributorsAlerts: React.FC<TopRiskScoreContributorsAlertsProps> = ({
  toggleStatus,
  toggleQuery,
  riskScore,
  riskEntity,
  loading,
}) => {
  const { to, from } = useGlobalTime();
  const [{ loading: userInfoLoading, signalIndexName, hasIndexWrite, hasIndexMaintenance }] =
    useUserData();
  const { runtimeMappings } = useSourcererDataView(SourcererScopeName.detections);
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);

  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const inputFilters = useMemo(() => {
    const riskScoreEntity =
      riskEntity === RiskScoreEntity.host
        ? (riskScore as HostRiskScore).host
        : (riskScore as UserRiskScore).user;

    const riskInputs = (riskScoreEntity?.risk?.inputs ?? []) as RiskInputs;
    return [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
        },
        query: {
          terms: {
            _id: riskInputs.map((item) => item.id),
          },
        },
      },
    ];
  }, [riskScore, riskEntity]);

  const renderGroupedAlertTable = useCallback(
    (groupingFilters: Filter[]) => {
      return (
        <AlertsTableComponent
          configId={ALERTS_TABLE_REGISTRY_CONFIG_IDS.RISK_INPUTS}
          inputFilters={[...inputFilters, ...filters, ...groupingFilters]}
          tableId={TableId.alertsRiskInputs}
        />
      );
    },
    [inputFilters, filters]
  );

  return (
    <EuiPanel hasBorder data-test-subj="topRiskScoreContributorsAlerts">
      <EuiFlexGroup gutterSize={'none'}>
        <EuiFlexItem grow={1}>
          <HeaderSection
            title={i18n.TOP_RISK_SCORE_CONTRIBUTORS}
            hideSubtitle
            toggleQuery={toggleQuery}
            toggleStatus={toggleStatus}
            headerFilters={<RiskInformationButtonEmpty riskEntity={riskEntity} />}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {toggleStatus && (
        <EuiFlexGroup
          data-test-subj="topRiskScoreContributorsAlerts-table"
          gutterSize="none"
          direction="column"
        >
          <EuiFlexItem grow={1}>
            <GroupedAlertsTable
              defaultFilters={[...inputFilters, ...filters]}
              from={from}
              globalFilters={filters}
              globalQuery={query}
              hasIndexMaintenance={hasIndexMaintenance ?? false}
              hasIndexWrite={hasIndexWrite ?? false}
              loading={userInfoLoading || loading}
              renderChildComponent={renderGroupedAlertTable}
              runtimeMappings={runtimeMappings}
              signalIndexName={signalIndexName}
              tableId={TableId.alertsRiskInputs}
              to={to}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
