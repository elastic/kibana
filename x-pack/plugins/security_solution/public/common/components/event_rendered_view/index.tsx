/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  CriteriaWithPagination,
  EuiBasicTableProps,
  EuiDataGridCellValueElementProps,
} from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_REASON, ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { get } from 'lodash';
import moment from 'moment';
import type { ComponentType } from 'react';
import React, { useCallback, useMemo, Suspense, lazy, useContext } from 'react';
import styled, { ThemeContext } from 'styled-components';

import { useUiSetting } from '@kbn/kibana-react-plugin/public';

import type { ConnectedProps } from 'react-redux';
import { useDispatch, connect } from 'react-redux';
import memoizeOne from 'memoize-one';
import type { FieldBrowserOptions } from '@kbn/triggers-actions-ui-plugin/public';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import type { SetEventsDeleted, SetEventsLoading } from '../../../../common/types/bulk_actions';
import { APP_UI_ID } from '../../../../common/constants';
import { getRowRenderer } from '../../../timelines/components/timeline/body/renderers/get_row_renderer';
import type { BrowserFields, TimelineItem } from '../../../../common/search_strategy';
import type {
  ColumnHeaderOptions,
  ControlColumnProps,
  OnRowSelected,
  OnSelectAll,
  RowRenderer,
} from '../../../../common/types';
import { RuleName } from '../rule_name';
import { isEventBuildingBlockType } from './helpers';
import { AlertCount } from '../toolbar/alert/styles';
import { defaultUnit } from '../toolbar/alert';
import { dataTableActions, dataTableSelectors } from '../../store/data_table';
import type { TGridModel } from '../../store/data_table/model';
import type { TableState } from '../../store/data_table/types';
import type { Refetch } from '../../store/data_table/inputs';
import type { AlertWorkflowStatus } from '../../types';
import type { BulkActionsProp } from '../toolbar/bulk_actions/types';
import { checkBoxControlColumn, transformControlColumns } from '../control_columns';
import { getColumnHeaders } from '../data_table/column_headers/helpers';
import { getEventIdToDataMapping } from '../data_table/helpers';
import { clearSelected } from '../../store/data_table/actions';

const StatefulAlertBulkActions = lazy(() => import('../toolbar/bulk_actions/alert_bulk_actions'));

const EventRenderedFlexItem = styled(EuiFlexItem)`
  div:first-child {
    padding-left: 0px;
    div {
      margin: 0px;
    }
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
  div div:first-child div.siemEventsTable__tdContent {
    margin-left: ${({ theme }) => theme.eui.euiSizeM};
  }
`;

// Fix typing issue with EuiBasicTable and styled
type BasicTableType = ComponentType<EuiBasicTableProps<TimelineItem>>;

const StyledEuiBasicTable = styled(EuiBasicTable as BasicTableType)`
  padding-top: ${({ theme }) => theme.eui.euiSizeM};
  .EventRenderedView__buildingBlock {
    background: ${({ theme }) => theme.eui.euiColorHighlight};
  }

  & > div:last-child {
    height: 72px;
  }

  & tr:nth-child(even) {
    background-color: ${({ theme }) => theme.eui.euiColorLightestShade};
  }

  & tr:nth-child(odd) {
    background-color: ${({ theme }) => theme.eui.euiColorEmptyShade};
  }
`;

export interface EventRenderedViewProps {
  events: TimelineItem[];
  bulkActions?: BulkActionsProp;
  leadingControlColumns: ControlColumnProps[];
  pageIndex: number;
  pageSize: number;
  pageSizeOptions: number[];
  rowRenderers: RowRenderer[];
  tableId: string;
  totalItemCount: number;
  unit?: (total: number) => React.ReactNode;
  hasAlertsCrud?: boolean;
  refetch: Refetch;
  filterQuery?: string;
  filterStatus?: AlertWorkflowStatus;
  indexNames: string[];
  loadPage: (newActivePage: number) => void;
  browserFields: BrowserFields;
  fieldBrowserOptions?: FieldBrowserOptions;
  disabledCellActions: string[];
  tabType: string;
  onRuleChange?: () => void;
}

export type StatefulEventRenderedViewProps = EventRenderedViewProps & PropsFromRedux;

const PreferenceFormattedDateComponent = ({ value }: { value: Date }) => {
  const tz = useUiSetting<string>('dateFormat:tz');
  const dateFormat = useUiSetting<string>('dateFormat');
  const zone: string = moment.tz.zone(tz)?.name ?? moment.tz.guess();

  return <span data-test-subj="moment-date">{moment.tz(value, zone).format(dateFormat)}</span>;
};
export const PreferenceFormattedDate = React.memo(PreferenceFormattedDateComponent);

const EventRenderedViewComponent = ({
  events,
  bulkActions,
  leadingControlColumns,
  pageIndex,
  pageSize,
  pageSizeOptions,
  rowRenderers,
  tableId,
  totalItemCount,
  unit = defaultUnit,
  selectedEventIds,
  showCheckboxes,
  hasAlertsCrud,
  refetch,
  filterQuery,
  filterStatus,
  indexNames,
  loadPage,
  browserFields,
  fieldBrowserOptions,
  columnHeaders,
  disabledCellActions,
  isSelectAllChecked,
  loadingEventIds,
  setSelected,
  sort,
  tabType,
  queryFields,
  onRuleChange,
}: StatefulEventRenderedViewProps) => {
  const dispatch = useDispatch();
  const theme: EuiTheme = useContext(ThemeContext);
  const alertCountText = useMemo(
    () => `${totalItemCount.toLocaleString()} ${unit(totalItemCount)}`,
    [totalItemCount, unit]
  );

  const selectedCount = useMemo(() => Object.keys(selectedEventIds).length, [selectedEventIds]);
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

  const showAlertStatusActions = useMemo(() => {
    if (!hasAlertsCrud) {
      return false;
    }
    if (typeof bulkActions === 'boolean') {
      return bulkActions;
    }
    return (bulkActions && bulkActions.alertStatusActions) ?? true;
  }, [bulkActions, hasAlertsCrud]);

  const onAlertStatusActionSuccess = useMemo(() => {
    if (bulkActions && bulkActions !== true) {
      return bulkActions.onAlertStatusActionSuccess;
    }
  }, [bulkActions]);

  const onChangeItemsPerPage = useCallback(
    (itemsChangedPerPage) => {
      dispatch(
        dataTableActions.updateItemsPerPage({ id: tableId, itemsPerPage: itemsChangedPerPage })
      );
    },
    [tableId, dispatch]
  );

  const onChangePage = useCallback(
    (page) => {
      loadPage(page);
    },
    [loadPage]
  );

  const setEventsLoading = useCallback<SetEventsLoading>(
    ({ eventIds, isLoading: loading }) => {
      dispatch(dataTableActions.setEventsLoading({ id: tableId, eventIds, isLoading: loading }));
    },
    [dispatch, tableId]
  );

  const setEventsDeleted = useCallback<SetEventsDeleted>(
    ({ eventIds, isDeleted }) => {
      dispatch(dataTableActions.setEventsDeleted({ id: tableId, eventIds, isDeleted }));
    },
    [dispatch, tableId]
  );

  const onRowSelected: OnRowSelected = useCallback(
    ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) => {
      setSelected({
        id: tableId,
        eventIds: getEventIdToDataMapping(events, eventIds, queryFields, hasAlertsCrud ?? false),
        isSelected,
        isSelectAllChecked: isSelected && selectedCount + 1 === events.length,
      });
    },
    [setSelected, tableId, events, queryFields, hasAlertsCrud, selectedCount]
  );

  const onSelectPage: OnSelectAll = useCallback(
    ({ isSelected }: { isSelected: boolean }) =>
      isSelected
        ? setSelected({
            id: tableId,
            eventIds: getEventIdToDataMapping(
              events,
              events.map((event) => event._id),
              queryFields,
              hasAlertsCrud ?? false
            ),
            isSelected,
            isSelectAllChecked: isSelected,
          })
        : clearSelected({ id: tableId }),
    [setSelected, tableId, events, queryFields, hasAlertsCrud]
  );

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
            const items = events.filter((item) => {
              return eventIds.find((event) => item._id === event);
            });
            action.onClick(items);
          },
        };
      });
    }
  }, [bulkActions, events]);

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
              id={tableId}
              totalItems={totalItemCount}
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
      tableId,
      indexNames,
      onAlertStatusActionFailure,
      onAlertStatusActionSuccess,
      refetch,
      showAlertStatusActions,
      showBulkActions,
      totalItemCount,
    ]
  );

  const [leadingTGridControlColumns] = useMemo(() => {
    return [
      showCheckboxes ? [checkBoxControlColumn, ...leadingControlColumns] : leadingControlColumns,
    ].map((controlColumns) =>
      transformControlColumns({
        columnHeaders,
        controlColumns,
        data: events,
        disabledCellActions,
        fieldBrowserOptions,
        loadingEventIds,
        onRowSelected,
        onRuleChange,
        selectedEventIds,
        showCheckboxes,
        tabType,
        timelineId: tableId,
        isSelectAllChecked,
        sort,
        browserFields,
        onSelectPage,
        theme,
        setEventsLoading,
        setEventsDeleted,
        pageSize,
      })
    );
  }, [
    showCheckboxes,
    leadingControlColumns,
    columnHeaders,
    events,
    disabledCellActions,
    fieldBrowserOptions,
    loadingEventIds,
    onRowSelected,
    onRuleChange,
    selectedEventIds,
    tabType,
    tableId,
    isSelectAllChecked,
    sort,
    browserFields,
    onSelectPage,
    theme,
    setEventsLoading,
    setEventsDeleted,
    pageSize,
  ]);

  const ActionTitle = useMemo(
    () => (
      <EuiFlexGroup gutterSize="m">
        {leadingTGridControlColumns.map((action) => {
          const ActionHeader = action.headerCellRender;
          return (
            <EuiFlexItem grow={false}>
              <ActionHeader />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    ),
    [leadingTGridControlColumns]
  );

  const columns = useMemo(
    () => [
      {
        field: 'actions',
        name: ActionTitle,
        truncateText: false,
        mobileOptions: { show: true },
        render: (name: unknown, item: unknown) => {
          const alertId = get(item, '_id');
          const rowIndex = events.findIndex((evt) => evt._id === alertId);
          return (
            <ActionsContainer>
              {leadingTGridControlColumns.length > 0
                ? leadingTGridControlColumns.map((action) => {
                    const getActions = action.rowCellRender as (
                      props: Omit<EuiDataGridCellValueElementProps, 'colIndex'>
                    ) => React.ReactNode;
                    return getActions({
                      columnId: 'actions',
                      isDetails: false,
                      isExpandable: false,
                      isExpanded: false,
                      rowIndex,
                      setCellProps: () => null,
                    });
                  })
                : null}
            </ActionsContainer>
          );
        },
        // TODO: derive this from ACTION_BUTTON_COUNT as other columns are done
        width: '184px',
      },
      {
        field: 'ecs.timestamp',
        name: i18n.translate('xpack.timelines.alerts.EventRenderedView.timestamp.column', {
          defaultMessage: 'Timestamp',
        }),
        truncateText: false,
        mobileOptions: { show: true },
        render: (name: unknown, item: TimelineItem) => {
          const timestamp = get(item, `ecs.timestamp`);
          return <PreferenceFormattedDate value={timestamp} />;
        },
      },
      {
        field: `ecs.${ALERT_RULE_NAME}`,
        name: i18n.translate('xpack.timelines.alerts.EventRenderedView.rule.column', {
          defaultMessage: 'Rule',
        }),
        truncateText: false,
        mobileOptions: { show: true },
        render: (name: unknown, item: TimelineItem) => {
          const ruleName = get(item, `ecs.signal.rule.name`) ?? get(item, `ecs.${ALERT_RULE_NAME}`);
          const ruleId = get(item, `ecs.signal.rule.id`) ?? get(item, `ecs.${ALERT_RULE_UUID}`);
          return <RuleName name={ruleName} id={ruleId} appId={APP_UI_ID} />;
        },
      },
      {
        field: 'eventSummary',
        name: i18n.translate('xpack.timelines.alerts.EventRenderedView.eventSummary.column', {
          defaultMessage: 'Event Summary',
        }),
        truncateText: false,
        mobileOptions: { show: true },
        render: (name: unknown, item: TimelineItem) => {
          const ecsData = get(item, 'ecs');
          const reason = get(item, `ecs.signal.reason`) ?? get(item, `ecs.${ALERT_REASON}`);
          const rowRenderer = getRowRenderer({ data: ecsData, rowRenderers });

          return (
            <EuiFlexGroup gutterSize="none" direction="column" className="eui-fullWidth">
              {rowRenderer != null ? (
                <EventRenderedFlexItem className="eui-xScroll">
                  <div className="eui-displayInlineBlock">
                    {rowRenderer.renderRow({
                      data: ecsData,
                      isDraggable: false,
                      scopeId: tableId,
                    })}
                  </div>
                </EventRenderedFlexItem>
              ) : (
                <>
                  {reason && <EuiFlexItem data-test-subj="plain-text-reason">{reason}</EuiFlexItem>}
                </>
              )}
            </EuiFlexGroup>
          );
        },
        width: '60%',
      },
    ],
    [ActionTitle, events, leadingTGridControlColumns, rowRenderers, tableId]
  );

  const handleTableChange = useCallback(
    (pageChange: CriteriaWithPagination<TimelineItem>) => {
      if (pageChange.page.index !== pageIndex) {
        onChangePage(pageChange.page.index);
      }
      if (pageChange.page.size !== pageSize) {
        onChangeItemsPerPage(pageChange.page.size);
      }
    },
    [onChangePage, pageIndex, pageSize, onChangeItemsPerPage]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions,
      showPerPageOptions: true,
    }),
    [pageIndex, pageSize, pageSizeOptions, totalItemCount]
  );

  return (
    <>
      {alertToolbar}
      <StyledEuiBasicTable
        compressed
        items={events}
        columns={columns}
        data-test-subj="event-rendered-view"
        pagination={pagination}
        onChange={handleTableChange}
        rowProps={({ ecs }: TimelineItem) =>
          isEventBuildingBlockType(ecs)
            ? {
                className: `EventRenderedView__buildingBlock`,
              }
            : {}
        }
      />
    </>
  );
};

export const EventRenderedView = React.memo(EventRenderedViewComponent);

const makeMapStateToProps = () => {
  const memoizedColumnHeaders: (
    headers: ColumnHeaderOptions[],
    browserFields: BrowserFields
  ) => ColumnHeaderOptions[] = memoizeOne(getColumnHeaders);
  const getDataTable = dataTableSelectors.getTableByIdSelector();
  const mapStateToProps = (
    state: TableState,
    { tableId, hasAlertsCrud, browserFields }: EventRenderedViewProps
  ) => {
    const dataTable: TGridModel = getDataTable(state, tableId);
    const {
      columns,
      isSelectAllChecked,
      loadingEventIds,
      selectedEventIds,
      showCheckboxes,
      sort,
      isLoading,
      queryFields,
    } = dataTable;

    return {
      tableId,
      columnHeaders: memoizedColumnHeaders(columns, browserFields),
      isSelectAllChecked,
      loadingEventIds,
      isLoading,
      selectedEventIds,
      showCheckboxes: hasAlertsCrud === true && showCheckboxes,
      sort,
      queryFields,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  clearSelected: dataTableActions.clearSelected,
  setSelected: dataTableActions.setSelected,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulEventRenderedView: React.FunctionComponent<EventRenderedViewProps> =
  connector(EventRenderedView);
