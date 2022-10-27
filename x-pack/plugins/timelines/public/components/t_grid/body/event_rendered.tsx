/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import memoizeOne from 'memoize-one';
import React, {
  ComponentType,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useContext,
} from 'react';
import { connect, ConnectedProps, useDispatch } from 'react-redux';

import { ThemeContext } from 'styled-components';
import { ALERT_RULE_CONSUMER, ALERT_RULE_PRODUCER } from '@kbn/rule-data-utils';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { FieldBrowserOptions } from '@kbn/triggers-actions-ui-plugin/public';
import {
  ColumnHeaderOptions,
  ControlColumnProps,
  SortColumnTimeline,
  TimelineId,
  TimelineTabs,
  SetEventsLoading,
  SetEventsDeleted,
} from '../../../../common/types/timeline';

import type { TimelineItem, TimelineNonEcsData } from '../../../../common/search_strategy/timeline';

import { getColumnHeaders } from './column_headers/helpers';
import { addBuildingBlockStyle, getEventIdToDataMapping } from './helpers';

import type { BrowserFields } from '../../../../common/search_strategy/index_fields';
import type { OnRowSelected, OnSelectAll } from '../types';
import { getPageRowIndex } from '../../../../common/utils/pagination';
import { tGridActions, TGridModel, tGridSelectors, TimelineState } from '../../../store/t_grid';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { RowAction } from './row_action';
import * as i18n from './translations';
import { AlertCount } from '../styles';
import { checkBoxControlColumn } from './control_columns';
import { EventRenderedView } from '../event_rendered_view';
import type { StatefulBodyProps } from '.';

const StatefulAlertBulkActions = lazy(() => import('../toolbar/bulk_actions/alert_bulk_actions'));

type OwnProps = Omit<StatefulBodyProps, 'tableView'>;

const defaultUnit = (n: number) => i18n.ALERTS_UNIT(n);

export const hasAdditionalActions = (id: TimelineId): boolean =>
  [TimelineId.detectionsPage, TimelineId.detectionsRulesDetailsPage, TimelineId.active].includes(
    id
  );

const EMPTY_CONTROL_COLUMNS: ControlColumnProps[] = [];

const EmptyHeaderCellRender: ComponentType = () => null;

const transformControlColumns = ({
  columnHeaders,
  controlColumns,
  data,
  fieldBrowserOptions,
  isEventViewer = false,
  loadingEventIds,
  onRowSelected,
  onRuleChange,
  selectedEventIds,
  showCheckboxes,
  tabType,
  timelineId,
  isSelectAllChecked,
  onSelectPage,
  browserFields,
  pageSize,
  sort,
  theme,
  setEventsLoading,
  setEventsDeleted,
  hasAlertsCrudPermissions,
}: {
  columnHeaders: ColumnHeaderOptions[];
  controlColumns: ControlColumnProps[];
  data: TimelineItem[];
  disabledCellActions: string[];
  fieldBrowserOptions?: FieldBrowserOptions;
  isEventViewer?: boolean;
  loadingEventIds: string[];
  onRowSelected: OnRowSelected;
  onRuleChange?: () => void;
  selectedEventIds: Record<string, TimelineNonEcsData[]>;
  showCheckboxes: boolean;
  tabType: TimelineTabs;
  timelineId: string;
  isSelectAllChecked: boolean;
  browserFields: BrowserFields;
  onSelectPage: OnSelectAll;
  pageSize: number;
  sort: SortColumnTimeline[];
  theme: EuiTheme;
  setEventsLoading: SetEventsLoading;
  setEventsDeleted: SetEventsDeleted;
  hasAlertsCrudPermissions?: ({
    ruleConsumer,
    ruleProducer,
  }: {
    ruleConsumer: string;
    ruleProducer?: string;
  }) => boolean;
}): EuiDataGridControlColumn[] =>
  controlColumns.map(
    ({ id: columnId, headerCellRender = EmptyHeaderCellRender, rowCellRender, width }, i) => ({
      id: `${columnId}`,
      headerCellRender: () => {
        const HeaderActions = headerCellRender;
        return (
          <>
            {HeaderActions && (
              <HeaderActions
                width={width}
                browserFields={browserFields}
                fieldBrowserOptions={fieldBrowserOptions}
                columnHeaders={columnHeaders}
                isEventViewer={isEventViewer}
                isSelectAllChecked={isSelectAllChecked}
                onSelectAll={onSelectPage}
                showEventsSelect={false}
                showSelectAllCheckbox={showCheckboxes}
                sort={sort}
                tabType={tabType}
                timelineId={timelineId}
              />
            )}
          </>
        );
      },
      rowCellRender: ({
        isDetails,
        isExpandable,
        isExpanded,
        rowIndex,
        colIndex,
        setCellProps,
      }: EuiDataGridCellValueElementProps) => {
        const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
        const rowData = data[pageRowIndex];

        let disabled = false;
        if (rowData) {
          addBuildingBlockStyle(rowData.ecs, theme, setCellProps);
          if (columnId === 'checkbox-control-column' && hasAlertsCrudPermissions != null) {
            // FUTURE ENGINEER, the assumption here is you can only have one producer and consumer at this time
            const ruleConsumers =
              rowData.data.find((d) => d.field === ALERT_RULE_CONSUMER)?.value ?? [];
            const ruleProducers =
              rowData.data.find((d) => d.field === ALERT_RULE_PRODUCER)?.value ?? [];
            disabled = !hasAlertsCrudPermissions({
              ruleConsumer: ruleConsumers.length > 0 ? ruleConsumers[0] : '',
              ruleProducer: ruleProducers.length > 0 ? ruleProducers[0] : undefined,
            });
          }
        } else {
          // disable the cell when it has no data
          setCellProps({ style: { display: 'none' } });
        }

        return (
          <RowAction
            columnId={columnId ?? ''}
            columnHeaders={columnHeaders}
            controlColumn={controlColumns[i]}
            data={data}
            disabled={disabled}
            index={i}
            isDetails={isDetails}
            isExpanded={isExpanded}
            isEventViewer={isEventViewer}
            isExpandable={isExpandable}
            loadingEventIds={loadingEventIds}
            onRowSelected={onRowSelected}
            onRuleChange={onRuleChange}
            rowIndex={rowIndex}
            colIndex={colIndex}
            pageRowIndex={pageRowIndex}
            selectedEventIds={selectedEventIds}
            setCellProps={setCellProps}
            showCheckboxes={showCheckboxes}
            tabType={tabType}
            timelineId={timelineId}
            width={width}
            setEventsLoading={setEventsLoading}
            setEventsDeleted={setEventsDeleted}
          />
        );
      },
      width,
    })
  );

export type EventRenderedStatefulBodyProps = OwnProps & PropsFromRedux;

/**
 * The Body component is used everywhere timeline is used within the security application. It is the highest level component
 * that is shared across all implementations of the timeline.
 */

export const BodyComponent = React.memo<EventRenderedStatefulBodyProps>(
  ({
    activePage,
    additionalControls,
    appId = '',
    browserFields,
    bulkActions = true,
    clearSelected,
    columnHeaders,
    data,
    defaultCellActions,
    disabledCellActions,
    fieldBrowserOptions,
    filterQuery,
    filters,
    filterStatus,
    hasAlertsCrud,
    hasAlertsCrudPermissions,
    id,
    indexNames,
    isEventViewer = false,
    isLoading,
    isSelectAllChecked,
    itemsPerPageOptions,
    leadingControlColumns = EMPTY_CONTROL_COLUMNS,
    loadingEventIds,
    loadPage,
    onRuleChange,
    pageSize,
    refetch,
    renderCellValue,
    rowRenderers,
    selectedEventIds,
    setSelected,
    showCheckboxes,
    sort,
    tabType,
    totalItems,
    totalSelectAllAlerts,
    unit = defaultUnit,
  }) => {
    const dispatch = useDispatch();
    const getManageTimeline = useMemo(() => tGridSelectors.getManageTimelineById(), []);
    const { queryFields, selectAll } = useDeepEqualSelector((state) =>
      getManageTimeline(state, id)
    );

    const alertCountText = useMemo(
      () => `${totalItems.toLocaleString()} ${unit(totalItems)}`,
      [totalItems, unit]
    );

    const selectedCount = useMemo(() => Object.keys(selectedEventIds).length, [selectedEventIds]);

    const theme: EuiTheme = useContext(ThemeContext);
    const onRowSelected: OnRowSelected = useCallback(
      ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) => {
        setSelected({
          id,
          eventIds: getEventIdToDataMapping(
            data,
            eventIds,
            queryFields,
            hasAlertsCrud ?? false,
            hasAlertsCrudPermissions
          ),
          isSelected,
          isSelectAllChecked: isSelected && selectedCount + 1 === data.length,
        });
      },
      [setSelected, id, data, queryFields, hasAlertsCrud, hasAlertsCrudPermissions, selectedCount]
    );

    const onSelectPage: OnSelectAll = useCallback(
      ({ isSelected }: { isSelected: boolean }) =>
        isSelected
          ? setSelected({
              id,
              eventIds: getEventIdToDataMapping(
                data,
                data.map((event) => event._id),
                queryFields,
                hasAlertsCrud ?? false,
                hasAlertsCrudPermissions
              ),
              isSelected,
              isSelectAllChecked: isSelected,
            })
          : clearSelected({ id }),
      [setSelected, id, data, queryFields, hasAlertsCrud, hasAlertsCrudPermissions, clearSelected]
    );

    // Sync to selectAll so parent components can select all events
    useEffect(() => {
      if (selectAll && !isSelectAllChecked) {
        onSelectPage({ isSelected: true });
      }
    }, [isSelectAllChecked, onSelectPage, selectAll]);

    const onAlertStatusActionSuccess = useMemo(() => {
      if (bulkActions && bulkActions !== true) {
        return bulkActions.onAlertStatusActionSuccess;
      }
    }, [bulkActions]);

    const onAlertStatusActionFailure = useMemo(() => {
      if (bulkActions && bulkActions !== true) {
        return bulkActions.onAlertStatusActionFailure;
      }
    }, [bulkActions]);

    const additionalBulkActions = useMemo(() => {
      if (bulkActions && bulkActions !== true && bulkActions.customBulkActions !== undefined) {
        return bulkActions.customBulkActions.map((action) => {
          return {
            ...action,
            onClick: (eventIds: string[]) => {
              const items = data.filter((item) => {
                return eventIds.find((event) => item._id === event);
              });
              action.onClick(items);
            },
          };
        });
      }
    }, [bulkActions, data]);

    const showAlertStatusActions = useMemo(() => {
      if (!hasAlertsCrud) {
        return false;
      }
      if (typeof bulkActions === 'boolean') {
        return bulkActions;
      }
      return bulkActions.alertStatusActions ?? true;
    }, [bulkActions, hasAlertsCrud]);

    const showBulkActions = useMemo(() => {
      if (!hasAlertsCrud) {
        return false;
      }

      if (selectedCount === 0 || !showCheckboxes) {
        return false;
      }
      if (typeof bulkActions === 'boolean') {
        return bulkActions;
      }
      return (bulkActions?.customBulkActions?.length || bulkActions?.alertStatusActions) ?? true;
    }, [hasAlertsCrud, selectedCount, showCheckboxes, bulkActions]);

    const alertToolbar = useMemo(
      () => (
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <AlertCount>{alertCountText}</AlertCount>
          </EuiFlexItem>
          {showBulkActions && (
            <Suspense fallback={<EuiLoadingSpinner />}>
              <StatefulAlertBulkActions
                showAlertStatusActions={showAlertStatusActions}
                data-test-subj="bulk-actions"
                id={id}
                totalItems={totalSelectAllAlerts ?? totalItems}
                filterStatus={filterStatus}
                query={filterQuery}
                indexName={indexNames.join()}
                onActionSuccess={onAlertStatusActionSuccess}
                onActionFailure={onAlertStatusActionFailure}
                customBulkActions={additionalBulkActions}
                refetch={refetch}
              />
            </Suspense>
          )}
        </EuiFlexGroup>
      ),
      [
        additionalBulkActions,
        alertCountText,
        filterQuery,
        filterStatus,
        id,
        indexNames,
        onAlertStatusActionFailure,
        onAlertStatusActionSuccess,
        refetch,
        showAlertStatusActions,
        showBulkActions,
        totalItems,
        totalSelectAllAlerts,
      ]
    );

    const setEventsLoading = useCallback<SetEventsLoading>(
      ({ eventIds, isLoading: loading }) => {
        dispatch(tGridActions.setEventsLoading({ id, eventIds, isLoading: loading }));
      },
      [dispatch, id]
    );

    const setEventsDeleted = useCallback<SetEventsDeleted>(
      ({ eventIds, isDeleted }) => {
        dispatch(tGridActions.setEventsDeleted({ id, eventIds, isDeleted }));
      },
      [dispatch, id]
    );

    const leadingTGridControlColumns = useMemo(() => {
      const controlColumns = showCheckboxes
        ? [checkBoxControlColumn, ...leadingControlColumns]
        : leadingControlColumns;
      return transformControlColumns({
        columnHeaders,
        controlColumns,
        data,
        disabledCellActions,
        fieldBrowserOptions,
        isEventViewer,
        loadingEventIds,
        onRowSelected,
        onRuleChange,
        selectedEventIds,
        showCheckboxes,
        tabType,
        timelineId: id,
        isSelectAllChecked,
        sort,
        browserFields,
        onSelectPage,
        theme,
        setEventsLoading,
        setEventsDeleted,
        pageSize,
        hasAlertsCrudPermissions,
      });
    }, [
      showCheckboxes,
      leadingControlColumns,
      columnHeaders,
      data,
      disabledCellActions,
      fieldBrowserOptions,
      isEventViewer,
      id,
      loadingEventIds,
      onRowSelected,
      onRuleChange,
      selectedEventIds,
      tabType,
      isSelectAllChecked,
      sort,
      browserFields,
      onSelectPage,
      theme,
      pageSize,
      setEventsLoading,
      setEventsDeleted,
      hasAlertsCrudPermissions,
    ]);

    const onChangeItemsPerPage = useCallback(
      (itemsChangedPerPage) => {
        dispatch(tGridActions.updateItemsPerPage({ id, itemsPerPage: itemsChangedPerPage }));
      },
      [id, dispatch]
    );

    const onChangePage = useCallback(
      (page) => {
        loadPage(page);
      },
      [loadPage]
    );

    return (
      <EventRenderedView
        appId={appId}
        alertToolbar={alertToolbar}
        events={data}
        leadingControlColumns={leadingTGridControlColumns ?? []}
        onChangePage={onChangePage}
        onChangeItemsPerPage={onChangeItemsPerPage}
        pageIndex={activePage}
        pageSize={pageSize}
        pageSizeOptions={itemsPerPageOptions}
        rowRenderers={rowRenderers}
        totalItemCount={totalItems}
      />
    );
  }
);

BodyComponent.displayName = 'BodyComponent';

const makeMapStateToProps = () => {
  const memoizedColumnHeaders: (
    headers: ColumnHeaderOptions[],
    browserFields: BrowserFields
  ) => ColumnHeaderOptions[] = memoizeOne(getColumnHeaders);

  const getTGrid = tGridSelectors.getTGridByIdSelector();
  const mapStateToProps = (
    state: TimelineState,
    { browserFields, id, hasAlertsCrud }: OwnProps
  ) => {
    const timeline: TGridModel = getTGrid(state, id);
    const {
      columns,
      excludedRowRendererIds,
      isSelectAllChecked,
      loadingEventIds,
      selectedEventIds,
      showCheckboxes,
      sort,
      isLoading,
    } = timeline;

    return {
      columnHeaders: memoizedColumnHeaders(columns, browserFields),
      excludedRowRendererIds,
      isSelectAllChecked,
      loadingEventIds,
      isLoading,
      id,
      selectedEventIds,
      showCheckboxes: hasAlertsCrud === true && showCheckboxes,
      sort,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  clearSelected: tGridActions.clearSelected,
  setSelected: tGridActions.setSelected,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefuEventRenderedBody: React.FunctionComponent<OwnProps> = connector(BodyComponent);
export default StatefuEventRenderedBody;
