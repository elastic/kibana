/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { useDispatch } from 'react-redux';
import type { Filter, Query } from '@kbn/es-query';
import { useGrouping } from '@kbn/securitysolution-grouping';
import type { TableIdLiteral } from '../../../../common/types';
import type { Status } from '../../../../common/detection_engine/schemas/common';
import { defaultUnit } from '../../../common/components/toolbar/unit';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { getDefaultGroupingOptions, renderGroupPanel, getStats } from './grouping_settings';
import { useKibana } from '../../../common/lib/kibana';
import { updateGroupSelector, updateSelectedGroup } from '../../../common/store/grouping/actions';
import { GroupedSubLevel } from './alerts_sub_grouping';
import { track } from '../../../common/lib/telemetry';

export interface AlertsTableComponentProps {
  currentAlertStatusFilterValue?: Status;
  defaultFilters?: Filter[];
  from: string;
  globalFilters: Filter[];
  globalQuery: Query;
  hasIndexMaintenance: boolean;
  hasIndexWrite: boolean;
  loading: boolean;
  renderChildComponent: (groupingFilters: Filter[]) => React.ReactElement;
  runtimeMappings: MappingRuntimeFields;
  signalIndexName: string | null;
  tableId: TableIdLiteral;
  to: string;
}

export const GroupedAlertsTableComponent: React.FC<AlertsTableComponentProps> = ({
  currentAlertStatusFilterValue,
  defaultFilters = [],
  from,
  globalFilters,
  globalQuery,
  hasIndexMaintenance,
  hasIndexWrite,
  loading,
  renderChildComponent,
  runtimeMappings,
  signalIndexName,
  tableId,
  to,
}) => {
  const dispatch = useDispatch();

  const { indexPattern } = useSourcererDataView(SourcererScopeName.detections);
  const {
    services: { telemetry },
  } = useKibana();
  const { onGroupChange, onGroupToggle } = useMemo(
    () => ({
      onGroupChange: (param: { groupByField: string; tableId: string }) => {
        telemetry.reportAlertsGroupingChanged(param);
      },
      onGroupToggle: (param: {
        isOpen: boolean;
        groupName?: string | undefined;
        groupNumber: number;
        groupingId: string;
      }) => telemetry.reportAlertsGroupingToggled({ ...param, tableId: param.groupingId }),
    }),
    [telemetry]
  );

  const { groupSelector, getGrouping, selectedGroups, pagination } = useGrouping({
    componentProps: {
      groupPanelRenderer: renderGroupPanel,
      groupStatsRenderer: getStats,
      onGroupToggle,
      renderChildComponent,
      unit: defaultUnit,
    },
    defaultGroupingOptions: getDefaultGroupingOptions(tableId),
    fields: indexPattern.fields,
    groupingId: tableId,
    maxGroupingLevels: 3,
    onGroupChange,
    tracker: track,
  });
  const resetPagination = pagination.reset;

  useEffect(() => {
    dispatch(updateGroupSelector({ groupSelector }));
  }, [dispatch, groupSelector]);

  useEffect(() => {
    dispatch(
      updateSelectedGroup({
        selectedGroups,
      })
    );
    resetPagination();
  }, [dispatch, resetPagination, selectedGroups]);

  const getLevel = useCallback(
    (level: number, selectedGroup: string, parentGroupingFilter?: Filter[]) => {
      return (
        <GroupedSubLevel
          currentAlertStatusFilterValue={currentAlertStatusFilterValue}
          defaultFilters={defaultFilters}
          from={from}
          getGrouping={getGrouping}
          globalFilters={globalFilters}
          globalQuery={globalQuery}
          groupingLevel={level}
          hasIndexMaintenance={hasIndexMaintenance}
          hasIndexWrite={hasIndexWrite}
          loading={loading}
          pagination={pagination}
          parentGroupingFilter={parentGroupingFilter}
          renderChildComponent={
            level < selectedGroups.length - 1
              ? (groupingFilters: Filter[]) =>
                  getLevel(level + 1, selectedGroups[level + 1], [
                    ...groupingFilters,
                    ...(parentGroupingFilter ?? []),
                  ])
              : (groupingFilters: Filter[]) =>
                  renderChildComponent([...groupingFilters, ...(parentGroupingFilter ?? [])])
          }
          runtimeMappings={runtimeMappings}
          selectedGroup={selectedGroup}
          signalIndexName={signalIndexName}
          tableId={tableId}
          to={to}
        />
      );
    },
    [
      currentAlertStatusFilterValue,
      defaultFilters,
      from,
      getGrouping,
      globalFilters,
      globalQuery,
      hasIndexMaintenance,
      hasIndexWrite,
      loading,
      pagination,
      renderChildComponent,
      runtimeMappings,
      selectedGroups,
      signalIndexName,
      tableId,
      to,
    ]
  );

  return (
    <>
      {groupSelector}
      {getLevel(0, selectedGroups[0])}
    </>
  );
};

export const GroupedAlertsTable = React.memo(GroupedAlertsTableComponent);
