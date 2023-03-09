/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { useDispatch } from 'react-redux';
import type { Filter, Query } from '@kbn/es-query';
import { useGrouping } from '@kbn/securitysolution-grouping';
import type { TableIdLiteral } from '../../../../common/types';
import type { Status } from '../../../../common/detection_engine/schemas/common';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';

import { getDefaultGroupingOptions } from './grouping_settings';
import { updateGroupSelector, updateSelectedGroup } from '../../../common/store/grouping/actions';
import { GroupedSubLevel } from './alerts_sub_grouping';

interface OwnProps {
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

export type AlertsTableComponentProps = OwnProps;

export const GroupedAlertsTableComponent: React.FC<AlertsTableComponentProps> = ({
  defaultFilters = [],
  from,
  globalFilters,
  globalQuery,
  hasIndexMaintenance,
  hasIndexWrite,
  loading,
  tableId,
  to,
  runtimeMappings,
  signalIndexName,
  currentAlertStatusFilterValue,
  renderChildComponent,
}) => {
  const dispatch = useDispatch();

  const { indexPattern } = useSourcererDataView(SourcererScopeName.detections);
  const { groupSelector, getGrouping, selectedGroups, pagination } = useGrouping({
    defaultGroupingOptions: getDefaultGroupingOptions(tableId),
    groupingId: tableId,
    fields: indexPattern.fields,
    maxGroupingLevels: 3,
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
          from={from}
          hasIndexMaintenance={hasIndexMaintenance}
          hasIndexWrite={hasIndexWrite}
          loading={loading}
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
          signalIndexName={signalIndexName}
          tableId={tableId}
          to={to}
          selectedGroup={selectedGroup}
          getGrouping={getGrouping}
          globalFilters={globalFilters}
          globalQuery={globalQuery}
          currentAlertStatusFilterValue={currentAlertStatusFilterValue}
          defaultFilters={defaultFilters}
          parentGroupingFilter={parentGroupingFilter}
          pagination={pagination}
          groupingLevel={level}
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
      renderChildComponent,
      runtimeMappings,
      selectedGroups,
      signalIndexName,
      tableId,
      to,
      pagination,
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
