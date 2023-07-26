/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable react/display-name */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import React, { useCallback, useContext, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type {
  AlertsTableConfigurationRegistry,
  RenderCustomActionsRowArgs,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import type { SubsetDataTableModel, TableId } from '@kbn/securitysolution-data-table';
import type { StatefulEventContextType } from '../../../common/components/events_viewer/stateful_event_context';
import { StatefulEventContext } from '../../../common/components/events_viewer/stateful_event_context';
import { eventsViewerSelector } from '../../../common/components/events_viewer/selectors';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { useLicense } from '../../../common/hooks/use_license';
import type { TimelineItem } from '../../../../common/search_strategy';
import { getAlertsDefaultModel } from '../../components/alerts_table/default_config';
import type { State } from '../../../common/store';
import { RowAction } from '../../../common/components/control_columns/row_action';
import type { ControlColumnProps } from '../../../../common/types';

const WrappedRowAction = React.memo(
  ({
    clearSelection,
    columns,
    cveProps,
    ecsAlert: alert,
    eventContext,
    leadingControlColumn,
    loadingEventIds,
    nonEcsData,
    refresh: alertsTableRefresh,
    rowIndex,
    selectedEventIds,
    setIsActionLoading,
    showCheckboxes,
    tableId,
  }: Omit<RenderCustomActionsRowArgs, 'alert' | 'setFlyoutAlert'> &
    Pick<
      SubsetDataTableModel,
      'columns' | 'loadingEventIds' | 'selectedEventIds' | 'showCheckboxes'
    > & {
      leadingControlColumn: ControlColumnProps;
      eventContext: StatefulEventContextType | null;
      tableId: TableId;
    }) => {
    const timelineItem: TimelineItem = useMemo(
      () => ({
        _id: (alert as Ecs)._id,
        _index: (alert as Ecs)._index,
        ecs: alert as Ecs,
        data: nonEcsData,
      }),
      [alert, nonEcsData]
    );

    const noop = useCallback(() => {}, []);
    const setEventLoading = useCallback(
      ({ isLoading }) => {
        if (!isLoading) {
          clearSelection();
          return;
        }
        if (setIsActionLoading) setIsActionLoading(isLoading);
      },
      [clearSelection, setIsActionLoading]
    );

    return (
      <RowAction
        columnId={`actions-${rowIndex}`}
        columnHeaders={columns}
        controlColumn={leadingControlColumn}
        data={timelineItem}
        disabled={false}
        index={rowIndex}
        isDetails={cveProps.isDetails}
        isExpanded={cveProps.isExpanded}
        isEventViewer={false}
        isExpandable={cveProps.isExpandable}
        loadingEventIds={loadingEventIds}
        onRowSelected={noop}
        rowIndex={cveProps.rowIndex}
        colIndex={cveProps.colIndex}
        pageRowIndex={rowIndex}
        selectedEventIds={selectedEventIds}
        setCellProps={cveProps.setCellProps}
        showCheckboxes={showCheckboxes}
        onRuleChange={eventContext?.onRuleChange}
        tabType={'query'}
        tableId={tableId}
        width={0}
        setEventsLoading={setEventLoading}
        setEventsDeleted={noop}
        refetch={alertsTableRefresh}
      />
    );
  }
);

export const getUseActionColumnHook =
  (tableId: TableId): AlertsTableConfigurationRegistry['useActionsColumn'] =>
  () => {
    const license = useLicense();
    const isEnterprisePlus = license.isEnterprise();
    const ACTION_BUTTON_COUNT = isEnterprisePlus ? 5 : 4;

    const eventContext = useContext(StatefulEventContext);

    const leadingControlColumn = useMemo(
      () => getDefaultControlColumn(ACTION_BUTTON_COUNT)[0],
      [ACTION_BUTTON_COUNT]
    );

    const {
      dataTable: {
        columns,
        showCheckboxes,
        selectedEventIds,
        loadingEventIds,
      } = getAlertsDefaultModel(license),
    } = useSelector((state: State) => eventsViewerSelector(state, tableId));

    const renderCustomActionsRow = useCallback(
      ({
        rowIndex,
        cveProps,
        setIsActionLoading,
        refresh,
        clearSelection,
        ecsAlert,
        nonEcsData,
      }) => {
        console.log('RE RENDERING! WRAPPED!'); // eslint-disable-line no-console
        return (
          <WrappedRowAction
            columns={columns}
            clearSelection={clearSelection}
            ecsAlert={ecsAlert}
            nonEcsData={nonEcsData}
            leadingControlColumn={leadingControlColumn}
            rowIndex={rowIndex}
            cveProps={cveProps}
            loadingEventIds={loadingEventIds}
            selectedEventIds={selectedEventIds}
            showCheckboxes={showCheckboxes}
            eventContext={eventContext}
            setIsActionLoading={setIsActionLoading}
            tableId={tableId}
            refresh={refresh}
          />
        );
      },
      [
        columns,
        leadingControlColumn,
        loadingEventIds,
        selectedEventIds,
        showCheckboxes,
        eventContext,
      ]
    );

    return {
      renderCustomActionsRow,
      width: leadingControlColumn.width,
    };
  };
