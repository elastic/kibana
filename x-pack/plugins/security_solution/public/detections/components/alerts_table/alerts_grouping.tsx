/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { useDispatch, useSelector } from 'react-redux';
import type { Filter, Query } from '@kbn/es-query';
import type { GroupOption } from '@kbn/securitysolution-grouping';
import { isNoneGroup, useGrouping } from '@kbn/securitysolution-grouping';
import { isEmpty, isEqual } from 'lodash/fp';
import { groupSelectors } from '../../../common/store/grouping';
import type { State } from '../../../common/store';
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

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_PAGE_INDEX = 0;

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

  const { groupSelector, getGrouping, selectedGroups } = useGrouping({
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

  const getGroupSelector = groupSelectors.getGroupSelector();

  const groupSelectorInRedux = useSelector((state: State) => getGroupSelector(state));
  const selectorOptions = useRef<GroupOption[]>([]);

  useEffect(() => {
    if (
      isNoneGroup(selectedGroups) &&
      (groupSelectorInRedux == null ||
        !isEqual(selectorOptions.current, groupSelector.props.options))
    ) {
      selectorOptions.current = groupSelector.props.options;
      dispatch(updateGroupSelector({ groupSelector }));
    } else if (!isNoneGroup(selectedGroups) && groupSelectorInRedux !== null) {
      dispatch(updateGroupSelector({ groupSelector: null }));
    }
  }, [dispatch, groupSelector, groupSelectorInRedux, selectedGroups]);

  const [pageIndex, setPageIndex] = useState<number[]>([DEFAULT_PAGE_INDEX]);
  const [pageSize, setPageSize] = useState<number[]>([DEFAULT_PAGE_SIZE]);

  useEffect(() => {
    setPageIndex((curr) => curr.map(() => DEFAULT_PAGE_INDEX));
  }, [selectedGroups]);

  const setPageVar = useCallback(
    (newNumber: number, groupingLevel: number, pageType: 'index' | 'size') => {
      if (pageType === 'index') {
        setPageIndex((currentIndex) => {
          const newArr = [...currentIndex];
          newArr[groupingLevel] = newNumber;
          return newArr;
        });
      }

      if (pageType === 'size') {
        setPageSize((currentIndex) => {
          const newArr = [...currentIndex];
          newArr[groupingLevel] = newNumber;
          return newArr;
        });
      }
    },
    []
  );

  const getLevel = useCallback(
    (level: number, selectedGroup: string, parentGroupingFilter?: string) => {
      let rcc;
      if (level < selectedGroups.length - 1) {
        rcc = (groupingFilters: Filter[]) => {
          return getLevel(
            level + 1,
            selectedGroups[level + 1],
            JSON.stringify([
              ...groupingFilters,
              ...(parentGroupingFilter ? JSON.parse(parentGroupingFilter) : []),
            ])
          );
        };
      } else {
        rcc = (groupingFilters: Filter[]) => {
          return props.renderChildComponent([
            ...groupingFilters,
            ...(parentGroupingFilter ? JSON.parse(parentGroupingFilter) : []),
          ]);
        };
      }

      const levelPageSize = pageSize[level];
      if (levelPageSize == null) {
        setPageVar(DEFAULT_PAGE_SIZE, level, 'size');
      }
      const levelPageIndex = pageIndex[level];
      if (levelPageIndex == null) {
        setPageVar(DEFAULT_PAGE_INDEX, level, 'index');
      }

      return (
        <GroupedSubLevel
          {...props}
          getGrouping={getGrouping}
          groupingLevel={level}
          pageIndex={pageIndex[level] ?? DEFAULT_PAGE_INDEX}
          pageSize={pageSize[level] ?? DEFAULT_PAGE_SIZE}
          parentGroupingFilter={parentGroupingFilter}
          renderChildComponent={rcc}
          selectedGroup={selectedGroup}
          setPageIndex={(newIndex: number) => setPageVar(newIndex, level, 'index')}
          setPageSize={(newSize: number) => setPageVar(newSize, level, 'size')}
        />
      );
    },
    [getGrouping, pageIndex, pageSize, props, selectedGroups, setPageVar]
  );

  if (isEmpty(selectedPatterns)) {
    return null;
  }

  return getLevel(0, selectedGroups[0]);
};

export const GroupedAlertsTable = React.memo(GroupedAlertsTableComponent);
