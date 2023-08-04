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

import { HeaderSection } from '../../../../common/components/header_section';

import * as i18n from './translations';

import { ALERTS_TABLE_REGISTRY_CONFIG_IDS } from '../../../../../common/constants';
import { AlertsTableComponent } from '../../../../detections/components/alerts_table';
import { GroupedAlertsTable } from '../../../../detections/components/alerts_table/alerts_grouping';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../common/store/inputs';
import { useUserData } from '../../../../detections/components/user_info';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';

export interface TopRiskScoreContributorsAlertsProps {
  loading: boolean;
  toggleStatus: boolean;
  toggleQuery?: (status: boolean) => void;
  riskScore: any;
  riskEntity: string;
}

export const TopRiskScoreContributorsAlerts: React.FC<TopRiskScoreContributorsAlertsProps> = ({
  toggleStatus,
  toggleQuery,
  riskScore,
  riskEntity,
}) => {
  const { to, from } = useGlobalTime();
  const [
    {
      loading: userInfoLoading,
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      canUserCRUD,
      hasIndexRead,
      signalIndexName,
      hasIndexWrite,
      hasIndexMaintenance,
    },
  ] = useUserData();
  const {
    indexPattern,
    runtimeMappings,
    loading: isLoadingIndexPattern,
  } = useSourcererDataView(SourcererScopeName.detections);
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);

  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const riskInputs = riskScore?.[riskEntity]?.risk?.inputs ?? [];
  const inputFilters = [
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
  console.log(riskInputs, 'RISK INPUTS 123');
  const renderGroupedAlertTable = useCallback(
    (groupingFilters: Filter[]) => {
      return (
        <AlertsTableComponent
          configId={ALERTS_TABLE_REGISTRY_CONFIG_IDS.RISK_INPUTS}
          flyoutSize="m"
          inputFilters={[...inputFilters, ...filters, ...groupingFilters]}
          tableId={TableId.alertsRiskInputs}
        />
      );
    },
    [inputFilters]
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
              loading={userInfoLoading}
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
