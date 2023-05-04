/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import moment from 'moment';
import type { OnTimeChangeProps, OnRefreshProps, OnRefreshChangeProps } from '@elastic/eui';
import {
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSuperDatePicker,
  EuiSpacer,
  EuiSwitch,
  EuiBasicTable,
  EuiButton,
} from '@elastic/eui';

import type { Filter, Query } from '@kbn/es-query';
import { buildFilter, FILTERS } from '@kbn/es-query';
import { MAX_EXECUTION_EVENTS_DISPLAYED } from '@kbn/securitysolution-rules';
import { mountReactNode } from '@kbn/core-mount-utils-browser-internal';

import { InputsModelId } from '../../../../../common/store/inputs/constants';
import { RuleDetailTabs } from '..';
import { RULE_DETAILS_EXECUTION_LOG_TABLE_SHOW_METRIC_COLUMNS_STORAGE_KEY } from '../../../../../../common/constants';
import type {
  RuleExecutionResult,
  RuleExecutionStatus,
} from '../../../../../../common/detection_engine/rule_monitoring';

import { HeaderSection } from '../../../../../common/components/header_section';
import {
  UtilityBar,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../common/components/utility_bar';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { useKibana } from '../../../../../common/lib/kibana';
import { inputsSelectors } from '../../../../../common/store';
import {
  setAbsoluteRangeDatePicker,
  setFilterQuery,
  setRelativeRangeDatePicker,
} from '../../../../../common/store/inputs/actions';
import type {
  AbsoluteTimeRange,
  RelativeTimeRange,
} from '../../../../../common/store/inputs/model';
import { isAbsoluteTimeRange, isRelativeTimeRange } from '../../../../../common/store/inputs/model';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { useExecutionResults } from '../../../../rule_monitoring';
import { useRuleDetailsContext } from '../rule_details_context';
import * as i18n from './translations';
import { EXECUTION_LOG_COLUMNS, GET_EXECUTION_LOG_METRICS_COLUMNS } from './execution_log_columns';
import { ExecutionLogSearchBar } from './execution_log_search_bar';

const EXECUTION_UUID_FIELD_NAME = 'kibana.alert.rule.execution.uuid';

const UtilitySwitch = styled(EuiSwitch)`
  margin-left: 17px;
`;

const DatePickerEuiFlexItem = styled(EuiFlexItem)`
  max-width: 582px;
`;

interface ExecutionLogTableProps {
  ruleId: string;
  selectAlertsTab: () => void;
}

interface CachedGlobalQueryState {
  filters: Filter[];
  query: Query;
  timerange: AbsoluteTimeRange | RelativeTimeRange;
}

const ExecutionLogTableComponent: React.FC<ExecutionLogTableProps> = ({
  ruleId,
  selectAlertsTab,
}) => {
  const {
    docLinks,
    data: {
      query: { filterManager },
    },
    storage,
    timelines,
  } = useKibana().services;

  const {
    [RuleDetailTabs.executionResults]: {
      state: {
        superDatePicker: { recentlyUsedRanges, refreshInterval, isPaused, start, end },
        queryText,
        statusFilters,
        showMetricColumns,
        pagination: { pageIndex, pageSize },
        sort: { sortField, sortDirection },
      },
      actions: {
        setEnd,
        setIsPaused,
        setPageIndex,
        setPageSize,
        setQueryText,
        setRecentlyUsedRanges,
        setRefreshInterval,
        setShowMetricColumns,
        setSortDirection,
        setSortField,
        setStart,
        setStatusFilters,
      },
    },
  } = useRuleDetailsContext();

  // Index for `add filter` action and toasts for errors
  const { indexPattern } = useSourcererDataView(SourcererScopeName.detections);
  const { addError, addSuccess, remove } = useAppToasts();

  // QueryString, Filters, and TimeRange state
  const dispatch = useDispatch();
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const timerange = useDeepEqualSelector(inputsSelectors.globalTimeRangeSelector);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const cachedGlobalQueryState = useRef<CachedGlobalQueryState>({ filters, query, timerange });
  const successToastId = useRef('');

  const resetGlobalQueryState = useCallback(() => {
    if (isAbsoluteTimeRange(cachedGlobalQueryState.current.timerange)) {
      dispatch(
        setAbsoluteRangeDatePicker({
          id: InputsModelId.global,
          from: cachedGlobalQueryState.current.timerange.from,
          to: cachedGlobalQueryState.current.timerange.to,
        })
      );
    } else if (isRelativeTimeRange(cachedGlobalQueryState.current.timerange)) {
      dispatch(
        setRelativeRangeDatePicker({
          id: InputsModelId.global,
          from: cachedGlobalQueryState.current.timerange.from,
          fromStr: cachedGlobalQueryState.current.timerange.fromStr,
          to: cachedGlobalQueryState.current.timerange.to,
          toStr: cachedGlobalQueryState.current.timerange.toStr,
        })
      );
    }

    dispatch(
      setFilterQuery({
        id: InputsModelId.global,
        query: cachedGlobalQueryState.current.query.query,
        language: cachedGlobalQueryState.current.query.language,
      })
    );
    // Using filterManager directly as dispatch(setSearchBarFilter()) was not replacing filters
    filterManager.removeAll();
    filterManager.addFilters(cachedGlobalQueryState.current.filters);
    remove(successToastId.current);
  }, [dispatch, filterManager, remove]);

  // Table data state
  const {
    data: events,
    dataUpdatedAt,
    isFetching,
    isLoading,
    refetch,
  } = useExecutionResults({
    ruleId,
    start,
    end,
    queryText,
    statusFilters,
    page: pageIndex,
    perPage: pageSize,
    sortField,
    sortOrder: sortDirection,
  });
  const items = events?.events ?? [];
  const maxEvents = events?.total ?? 0;

  // Cache UUID field from data view as it can be expensive to iterate all data view fields
  const uuidDataViewField = useMemo(() => {
    return indexPattern.fields.find((f) => f.name === EXECUTION_UUID_FIELD_NAME);
  }, [indexPattern]);

  // Callbacks
  const onTableChangeCallback = useCallback(
    ({ page = {}, sort = {} }) => {
      const { index, size } = page;
      const { field, direction } = sort;

      setPageIndex(index + 1);
      setPageSize(size);
      setSortField(field);
      setSortDirection(direction);
    },
    [setPageIndex, setPageSize, setSortDirection, setSortField]
  );

  const onTimeChangeCallback = useCallback(
    (props: OnTimeChangeProps) => {
      const recentlyUsedRange = recentlyUsedRanges.filter((range) => {
        const isDuplicate = range.start === props.start && range.end === props.end;
        return !isDuplicate;
      });
      recentlyUsedRange.unshift({ start: props.start, end: props.end });
      setStart(props.start);
      setEnd(props.end);
      setRecentlyUsedRanges(
        recentlyUsedRange.length > 10 ? recentlyUsedRange.slice(0, 9) : recentlyUsedRange
      );
    },
    [recentlyUsedRanges, setEnd, setRecentlyUsedRanges, setStart]
  );

  const onRefreshChangeCallback = useCallback(
    (props: OnRefreshChangeProps) => {
      setIsPaused(props.isPaused);
      // Only support auto-refresh >= 1minute -- no current ability to limit within component
      setRefreshInterval(props.refreshInterval > 60000 ? props.refreshInterval : 60000);
    },
    [setIsPaused, setRefreshInterval]
  );

  const onRefreshCallback = useCallback(
    (props: OnRefreshProps) => {
      refetch();
    },
    [refetch]
  );

  const onSearchCallback = useCallback(
    (updatedQueryText: string) => {
      setQueryText(updatedQueryText);
    },
    [setQueryText]
  );

  const onStatusFilterChangeCallback = useCallback(
    (updatedStatusFilters: RuleExecutionStatus[]) => {
      setStatusFilters(updatedStatusFilters);
    },
    [setStatusFilters]
  );

  const onFilterByExecutionIdCallback = useCallback(
    (executionId: string, executionStart: string) => {
      if (uuidDataViewField != null) {
        // Update cached global query state with current state as a rollback point
        cachedGlobalQueryState.current = { filters, query, timerange };
        // Create filter & daterange constraints
        const filter = buildFilter(
          indexPattern,
          uuidDataViewField,
          FILTERS.PHRASE,
          false,
          false,
          executionId,
          null
        );
        dispatch(
          setAbsoluteRangeDatePicker({
            id: InputsModelId.global,
            from: moment(executionStart).subtract(1, 'days').toISOString(),
            to: moment(executionStart).add(1, 'days').toISOString(),
          })
        );
        filterManager.removeAll();
        filterManager.addFilters(filter);
        dispatch(setFilterQuery({ id: InputsModelId.global, query: '', language: 'kuery' }));
        selectAlertsTab();
        successToastId.current = addSuccess(
          {
            title: i18n.ACTIONS_SEARCH_FILTERS_HAVE_BEEN_UPDATED_TITLE,
            text: mountReactNode(
              <>
                <p>{i18n.ACTIONS_SEARCH_FILTERS_HAVE_BEEN_UPDATED_DESCRIPTION}</p>
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButton size="s" onClick={resetGlobalQueryState}>
                      {i18n.ACTIONS_SEARCH_FILTERS_HAVE_BEEN_UPDATED_RESTORE_BUTTON}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            ),
          },
          // Essentially keep toast around till user dismisses via 'x'
          { toastLifeTimeMs: 10 * 60 * 1000 }
        ).id;
      } else {
        addError(i18n.ACTIONS_FIELD_NOT_FOUND_ERROR, {
          title: i18n.ACTIONS_FIELD_NOT_FOUND_ERROR_TITLE,
        });
      }
    },
    [
      addError,
      addSuccess,
      dispatch,
      filterManager,
      filters,
      indexPattern,
      query,
      resetGlobalQueryState,
      selectAlertsTab,
      timerange,
      uuidDataViewField,
    ]
  );

  const onShowMetricColumnsCallback = useCallback(
    (showMetrics: boolean) => {
      storage.set(RULE_DETAILS_EXECUTION_LOG_TABLE_SHOW_METRIC_COLUMNS_STORAGE_KEY, showMetrics);
      setShowMetricColumns(showMetrics);
    },
    [setShowMetricColumns, storage]
  );

  // Memoized state
  const pagination = useMemo(() => {
    return {
      pageIndex: pageIndex - 1,
      pageSize,
      totalItemCount:
        maxEvents > MAX_EXECUTION_EVENTS_DISPLAYED ? MAX_EXECUTION_EVENTS_DISPLAYED : maxEvents,
      pageSizeOptions: [5, 10, 25, 50],
    };
  }, [maxEvents, pageIndex, pageSize]);

  const sorting = useMemo(() => {
    return {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };
  }, [sortDirection, sortField]);

  const actions = useMemo(
    () => [
      {
        field: EXECUTION_UUID_FIELD_NAME,
        name: i18n.COLUMN_ACTIONS,
        width: '5%',
        actions: [
          {
            name: 'Edit',
            isPrimary: true,
            field: '',
            description: i18n.COLUMN_ACTIONS_TOOLTIP,
            icon: 'filter',
            type: 'icon',
            onClick: (executionEvent: RuleExecutionResult) => {
              if (executionEvent?.execution_uuid) {
                onFilterByExecutionIdCallback(
                  executionEvent.execution_uuid,
                  executionEvent.timestamp
                );
              }
            },
            'data-test-subj': 'action-filter-by-execution-id',
          },
        ],
      },
    ],
    [onFilterByExecutionIdCallback]
  );

  const executionLogColumns = useMemo(
    () =>
      showMetricColumns
        ? [...EXECUTION_LOG_COLUMNS, ...GET_EXECUTION_LOG_METRICS_COLUMNS(docLinks), ...actions]
        : [...EXECUTION_LOG_COLUMNS, ...actions],
    [actions, docLinks, showMetricColumns]
  );

  return (
    <EuiPanel hasBorder>
      {/* Filter bar */}
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={true}>
          <HeaderSection title={i18n.TABLE_TITLE} subtitle={i18n.TABLE_SUBTITLE} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ExecutionLogSearchBar
            onlyShowFilters={true}
            selectedStatuses={statusFilters}
            onStatusFilterChange={onStatusFilterChangeCallback}
            onSearch={onSearchCallback}
          />
        </EuiFlexItem>
        <DatePickerEuiFlexItem>
          <EuiSuperDatePicker
            start={start}
            end={end}
            onTimeChange={onTimeChangeCallback}
            onRefresh={onRefreshCallback}
            isPaused={isPaused}
            isLoading={isFetching}
            refreshInterval={refreshInterval}
            onRefreshChange={onRefreshChangeCallback}
            recentlyUsedRanges={recentlyUsedRanges}
            width="full"
          />
        </DatePickerEuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {/* Utility bar */}
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText dataTestSubj="executionsShowing">
              {i18n.SHOWING_EXECUTIONS(
                maxEvents > MAX_EXECUTION_EVENTS_DISPLAYED
                  ? MAX_EXECUTION_EVENTS_DISPLAYED
                  : maxEvents
              )}
            </UtilityBarText>
          </UtilityBarGroup>
          {maxEvents > MAX_EXECUTION_EVENTS_DISPLAYED && (
            <UtilityBarGroup grow={true}>
              <UtilityBarText dataTestSubj="exceptionsShowing" shouldWrap={true}>
                <EuiTextColor color="danger">
                  {i18n.RULE_EXECUTION_LOG_SEARCH_LIMIT_EXCEEDED(
                    maxEvents,
                    MAX_EXECUTION_EVENTS_DISPLAYED
                  )}
                </EuiTextColor>
              </UtilityBarText>
            </UtilityBarGroup>
          )}
        </UtilityBarSection>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText dataTestSubj="lastUpdated">
              {timelines.getLastUpdated({
                showUpdating: isLoading || isFetching,
                updatedAt: dataUpdatedAt,
              })}
            </UtilityBarText>
            <UtilitySwitch
              label={i18n.RULE_EXECUTION_LOG_SHOW_METRIC_COLUMNS_SWITCH}
              checked={showMetricColumns}
              compressed={true}
              onChange={(e) => onShowMetricColumnsCallback(e.target.checked)}
            />
          </UtilityBarGroup>
        </UtilityBarSection>
      </UtilityBar>

      {/* Table with items */}
      <EuiBasicTable
        columns={executionLogColumns}
        items={items}
        loading={isFetching}
        sorting={sorting}
        pagination={pagination}
        onChange={onTableChangeCallback}
      />
    </EuiPanel>
  );
};

export const ExecutionLogTable = React.memo(ExecutionLogTableComponent);
ExecutionLogTable.displayName = 'ExecutionLogTable';
