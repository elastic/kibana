/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { AlertsTableConfigurationRegistry } from '@kbn/triggers-actions-ui-plugin/public/types';
import { eventsViewerSelector } from '../../../common/components/events_viewer/selectors';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { useLicense } from '../../../common/hooks/use_license';
import type { TimelineItem } from '../../../../common/search_strategy';
import { getAlertsDefaultModel } from '../../components/alerts_table/default_config';
import type { TableId } from '../../../../common/types';
import type { State } from '../../../common/store';
import { useUserData } from '../../components/user_info';
import { RowAction } from '../../../common/components/control_columns/row_action';

export const getUseActionColumnHook =
  (tableId: TableId): AlertsTableConfigurationRegistry['useActionsColumn'] =>
  () => {
    const license = useLicense();
    const isEnterprisePlus = license.isEnterprise();
    const ACTION_BUTTON_COUNT = isEnterprisePlus ? 5 : 4;

    const leadingControlColumns = useMemo(
      () => [...getDefaultControlColumn(ACTION_BUTTON_COUNT)],
      [ACTION_BUTTON_COUNT]
    );

    // const {
    // setEventsDeleted: setEventsDeletedAction,
    // setEventsLoading: setEventsLoadingAction,
    // setSelected,
    // } = dataTableActions;

    const {
      dataTable: {
        columns,
        deletedEventIds,
        showCheckboxes,
        queryFields,
        selectedEventIds,
        loadingEventIds,
      } = getAlertsDefaultModel(license),
    } = useSelector((state: State) => eventsViewerSelector(state, tableId));

    const [{ hasIndexWrite = false, hasIndexMaintenance = false }] = useUserData();

    const hasCrudPermissions = useMemo(
      () => hasIndexWrite && hasIndexMaintenance,
      [hasIndexMaintenance, hasIndexWrite]
    );

    const selectedCount = useMemo(() => Object.keys(selectedEventIds).length, [selectedEventIds]);

    // const onRowSelected: OnRowSelected = useCallback(
    // ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) => {
    // setSelected({
    // id: tableId,
    // eventIds: getEventIdToDataMapping(
    // nonDeletedEvents,
    // eventIds,
    // queryFields,
    // hasCrudPermissions as boolean
    // ),
    // isSelected,
    // isSelectAllChecked: isSelected && selectedCount + 1 === nonDeletedEvent.length,
    // });
    // },
    // [setSelected, nonDeletedEvents, queryFields, hasCrudPermissions, selectedCount]
    // );

    const columnHeaders = columns;

    return {
      renderCustomActionsRow: ({
        rowIndex,
        cveProps,
        setIsActionLoading,
        refresh,
        clearSelection,
        ecsAlert: alert,
        nonEcsData,
      }) => {
        const timelineItem: TimelineItem = {
          _id: (alert as Ecs)._id,
          _index: (alert as Ecs)._index,
          ecs: alert as Ecs,
          data: nonEcsData,
        };
        return (
          <RowAction
            columnId={`actions-${rowIndex}`}
            columnHeaders={columnHeaders}
            controlColumn={leadingControlColumns[0]}
            data={timelineItem}
            disabled={false}
            index={rowIndex}
            isDetails={cveProps.isDetails}
            isExpanded={cveProps.isExpanded}
            isEventViewer={false}
            isExpandable={cveProps.isExpandable}
            loadingEventIds={loadingEventIds}
            onRowSelected={() => {}}
            rowIndex={cveProps.rowIndex}
            colIndex={cveProps.colIndex}
            pageRowIndex={rowIndex}
            selectedEventIds={selectedEventIds}
            setCellProps={cveProps.setCellProps}
            showCheckboxes={showCheckboxes}
            tabType={'query'}
            tableId={tableId}
            width={0}
            setEventsLoading={({ isLoading }) => {
              if (!isLoading) {
                clearSelection();
                return;
              }
              if (setIsActionLoading) setIsActionLoading(isLoading);
            }}
            setEventsDeleted={() => {}}
            refetch={refresh}
          />
        );
      },
      width: 124,
    };
  };
