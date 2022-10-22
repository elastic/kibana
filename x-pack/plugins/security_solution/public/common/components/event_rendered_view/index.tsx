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
  EuiDataGridControlColumn,
} from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_REASON, ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { get } from 'lodash';
import moment from 'moment';
import type { ComponentType } from 'react';
import React, { useCallback, useMemo, Suspense, lazy } from 'react';
import styled from 'styled-components';

import { useUiSetting } from '@kbn/kibana-react-plugin/public';

import type { ConnectedProps } from 'react-redux';
import { connect } from 'react-redux';
import type { Ecs } from '../../../../common/ecs';
import type { TimelineItem } from '../../../../common/search_strategy';
import type { RowRenderer } from '../../../../common/types';
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
  appId: string;
  events: TimelineItem[];
  bulkActions?: BulkActionsProp;
  id: string;
  getRowRenderer?: ({
    data,
    rowRenderers,
  }: {
    data: Ecs;
    rowRenderers: RowRenderer[];
  }) => RowRenderer | null;
  leadingControlColumns: EuiDataGridControlColumn[];
  onChangePage: (newActivePage: number) => void;
  onChangeItemsPerPage: (newItemsPerPage: number) => void;
  pageIndex: number;
  pageSize: number;
  pageSizeOptions: number[];
  rowRenderers: RowRenderer[];
  timelineId: string;
  totalItemCount: number;
  unit?: (total: number) => React.ReactNode;
  hasAlertsCrud?: boolean;
  refetch: Refetch;
  totalSelectAllAlerts?: number;
  filterQuery?: string;
  filterStatus?: AlertWorkflowStatus;
  indexNames: string[];
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
  appId,
  events,
  bulkActions,
  id,
  getRowRenderer,
  leadingControlColumns,
  onChangePage,
  onChangeItemsPerPage,
  pageIndex,
  pageSize,
  pageSizeOptions,
  rowRenderers,
  timelineId,
  totalItemCount,
  unit = defaultUnit,
  selectedEventIds,
  showCheckboxes,
  hasAlertsCrud,
  refetch,
  totalSelectAllAlerts,
  filterQuery,
  filterStatus,
  indexNames,
}: StatefulEventRenderedViewProps) => {
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
              id={id}
              totalItems={totalSelectAllAlerts ?? totalItemCount}
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
      totalItemCount,
      totalSelectAllAlerts,
    ]
  );

  const ActionTitle = useMemo(
    () => (
      <EuiFlexGroup gutterSize="m">
        {leadingControlColumns.map((action) => {
          const ActionHeader = action.headerCellRender;
          return (
            <EuiFlexItem grow={false}>
              <ActionHeader />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    ),
    [leadingControlColumns]
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
              {leadingControlColumns.length > 0
                ? leadingControlColumns.map((action) => {
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
          return <RuleName name={ruleName} id={ruleId} appId={appId} />;
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
          const rowRenderer =
            getRowRenderer != null
              ? getRowRenderer({ data: ecsData, rowRenderers })
              : rowRenderers.find((x) => x.isInstance(ecsData)) ?? null;

          return (
            <EuiFlexGroup gutterSize="none" direction="column" className="eui-fullWidth">
              {rowRenderer != null ? (
                <EventRenderedFlexItem className="eui-xScroll">
                  <div className="eui-displayInlineBlock">
                    {rowRenderer.renderRow({
                      data: ecsData,
                      isDraggable: false,
                      scopeId: timelineId,
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
    [ActionTitle, events, leadingControlColumns, appId, getRowRenderer, rowRenderers, timelineId]
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
  const getDataTable = dataTableSelectors.getTableByIdSelector();
  const mapStateToProps = (state: TableState, { id, hasAlertsCrud }: EventRenderedViewProps) => {
    const dataTable: TGridModel = getDataTable(state, id);
    const { selectedEventIds, showCheckboxes } = dataTable;

    return {
      id,
      selectedEventIds,
      showCheckboxes: hasAlertsCrud === true && showCheckboxes,
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
