/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { useDispatch } from 'react-redux';
import type { Filter, Query } from '@kbn/es-query';
import type { GroupOption } from '@kbn/securitysolution-grouping';
import { isNoneGroup, useGrouping } from '@kbn/securitysolution-grouping';
import { isEmpty, isEqual } from 'lodash/fp';
import { updateGroupSelector } from '../../../common/store/grouping/actions';
import type { TableIdLiteral } from '../../../../common/types';
import type { Status } from '../../../../common/detection_engine/schemas/common';
import { defaultUnit } from '../../../common/components/toolbar/unit';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { getDefaultGroupingOptions, renderGroupPanel, getStats } from './grouping_settings';
import { useKibana } from '../../../common/lib/kibana';
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

export const GroupedAlertsTableComponent: React.FC<AlertsTableComponentProps> = (props) => {
  const dispatch = useDispatch();

  const { indexPattern, selectedPatterns } = useSourcererDataView(SourcererScopeName.detections);

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

  const { groupSelector, getGrouping, selectedGroups, pagination, resetPagination } = useGrouping({
    componentProps: {
      groupPanelRenderer: renderGroupPanel,
      groupStatsRenderer: getStats,
      onGroupToggle,
      unit: defaultUnit,
    },
    defaultGroupingOptions: getDefaultGroupingOptions(props.tableId),
    fields: indexPattern.fields,
    groupingId: props.tableId,
    maxGroupingLevels: 3,
    onGroupChange,
    tracker: track,
  });

  const selectorOptions = useRef<GroupOption[]>([]);

  useEffect(() => {
    if (
      isNoneGroup(selectedGroups) &&
      !isEqual(selectorOptions.current, groupSelector.props.options)
    ) {
      selectorOptions.current = groupSelector.props.options;
      dispatch(updateGroupSelector({ groupSelector }));
    }
  }, [dispatch, groupSelector, selectedGroups]);

  useEffect(() => {
    console.log('grouping mount');
    return () => {
      console.log('grouping unmount');
    };
  });
  const getLevel = useCallback(
    (
      level: number,
      selectedGroup: string,
      parentGroupingFilter?: Filter[],
      isRecursive = false
    ) => {
      let rcc;
      if (level < selectedGroups.length - 1) {
        rcc = (groupingFilters: Filter[]) => {
          return getLevel(
            level + 1,
            selectedGroups[level + 1],
            [...groupingFilters, ...(parentGroupingFilter ?? [])],
            true
          );
        };
      } else {
        rcc = (groupingFilters: Filter[]) => {
          return props.renderChildComponent([...groupingFilters, ...(parentGroupingFilter ?? [])]);
        };
      }
      return (
        <GroupedSubLevel
          // all GroupedAlertsTableComponent are passed to GroupedSubLevel, renderChildComponent is overwritten below
          {...props}
          getGrouping={getGrouping}
          groupingLevel={level}
          pagination={pagination}
          resetPagination={resetPagination}
          parentGroupingFilter={parentGroupingFilter}
          renderChildComponent={rcc}
          selectedGroup={selectedGroup}
        />
      );
    },
    [getGrouping, pagination, props, resetPagination, selectedGroups]
  );

  if (isEmpty(selectedPatterns)) {
    return null;
  }

  return getLevel(0, selectedGroups[0]);
};

export const GroupedAlertsTable = React.memo(GroupedAlertsTableComponent);
