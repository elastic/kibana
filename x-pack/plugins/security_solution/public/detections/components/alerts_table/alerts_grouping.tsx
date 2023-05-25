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
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { TableIdLiteral } from '@kbn/securitysolution-data-table';
import { groupSelectors } from '../../../common/store/grouping';
import type { State } from '../../../common/store';
import { updateGroupSelector } from '../../../common/store/grouping/actions';
import type { Status } from '../../../../common/detection_engine/schemas/common';
import { defaultUnit } from '../../../common/components/toolbar/unit';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { getDefaultGroupingOptions, renderGroupPanel, getStats } from './grouping_settings';
import { useKibana } from '../../../common/lib/kibana';
import { GroupedSubLevel } from './alerts_sub_grouping';
import { track } from '../../../common/lib/telemetry';

export interface AlertsTableComponentProps {
  currentAlertStatusFilterValue?: Status[];
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
const MAX_GROUPING_LEVELS = 3;

const useStorage = (storage: Storage, tableId: string) =>
  useMemo(
    () => ({
      getStoragePageSize: (): number[] => {
        const pageSizes = storage.get(`grouping-table-${tableId}`);
        if (!pageSizes) {
          return Array(MAX_GROUPING_LEVELS).fill(DEFAULT_PAGE_SIZE);
        }
        return pageSizes;
      },
      setStoragePageSize: (pageSizes: number[]) => {
        storage.set(`grouping-table-${tableId}`, pageSizes);
      },
    }),
    [storage, tableId]
  );

const GroupedAlertsTableComponent: React.FC<AlertsTableComponentProps> = (props) => {
  const dispatch = useDispatch();

  const { indexPattern, selectedPatterns } = useSourcererDataView(SourcererScopeName.detections);

  const {
    services: { storage, telemetry },
  } = useKibana();

  const { getStoragePageSize, setStoragePageSize } = useStorage(storage, props.tableId);

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
    maxGroupingLevels: MAX_GROUPING_LEVELS,
    onGroupChange,
    tracker: track,
  });

  const getGroupSelector = groupSelectors.getGroupSelector();

  const groupSelectorInRedux = useSelector((state: State) => getGroupSelector(state));
  const selectorOptions = useRef<GroupOption[]>([]);

  useEffect(() => {
    if (
      isNoneGroup(selectedGroups) &&
      groupSelector.props.options.length > 0 &&
      (groupSelectorInRedux == null ||
        !isEqual(selectorOptions.current, groupSelector.props.options))
    ) {
      selectorOptions.current = groupSelector.props.options;
      dispatch(updateGroupSelector({ groupSelector }));
    } else if (!isNoneGroup(selectedGroups) && groupSelectorInRedux !== null) {
      dispatch(updateGroupSelector({ groupSelector: null }));
    }
  }, [dispatch, groupSelector, groupSelectorInRedux, selectedGroups]);

  const [pageIndex, setPageIndex] = useState<number[]>(
    Array(MAX_GROUPING_LEVELS).fill(DEFAULT_PAGE_INDEX)
  );
  const [pageSize, setPageSize] = useState<number[]>(getStoragePageSize);

  const resetAllPagination = useCallback(() => {
    setPageIndex((curr) => curr.map(() => DEFAULT_PAGE_INDEX));
  }, []);

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
          setStoragePageSize(newArr);
          return newArr;
        });
        // set page index to 0 when page size is changed
        setPageIndex((currentIndex) => {
          const newArr = [...currentIndex];
          newArr[groupingLevel] = 0;
          return newArr;
        });
      }
    },
    [setStoragePageSize]
  );

  const paginationResetTriggers = useRef({
    defaultFilters: props.defaultFilters,
    globalFilters: props.globalFilters,
    globalQuery: props.globalQuery,
    selectedGroups,
  });

  useEffect(() => {
    const triggers = {
      defaultFilters: props.defaultFilters,
      globalFilters: props.globalFilters,
      globalQuery: props.globalQuery,
      selectedGroups,
    };
    if (!isEqual(paginationResetTriggers.current, triggers)) {
      resetAllPagination();
      paginationResetTriggers.current = triggers;
    }
  }, [
    props.defaultFilters,
    props.globalFilters,
    props.globalQuery,
    resetAllPagination,
    selectedGroups,
  ]);

  const getLevel = useCallback(
    (level: number, selectedGroup: string, parentGroupingFilter?: string) => {
      let rcc;
      if (level < selectedGroups.length - 1) {
        rcc = (groupingFilters: Filter[]) => {
          return getLevel(
            level + 1,
            selectedGroups[level + 1],
            // stringify because if the filter is passed as an object, it will cause unnecessary re-rendering
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

      const resetGroupChildrenPagination = (parentLevel: number) => {
        setPageIndex((allPages) => {
          const resetPages = allPages.splice(parentLevel + 1, allPages.length);
          return [...allPages, ...resetPages.map(() => DEFAULT_PAGE_INDEX)];
        });
      };
      return (
        <GroupedSubLevel
          {...props}
          getGrouping={getGrouping}
          groupingLevel={level}
          onGroupClose={() => resetGroupChildrenPagination(level)}
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
