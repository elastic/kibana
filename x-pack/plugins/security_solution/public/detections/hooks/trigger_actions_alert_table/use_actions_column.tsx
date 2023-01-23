/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsTableConfigurationRegistry } from '@kbn/triggers-actions-ui-plugin/public/types';
import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { eventsViewerSelector } from '../../../common/components/events_viewer/selectors';
import type { Ecs } from '../../../../common/ecs';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { useLicense } from '../../../common/hooks/use_license';
import type { TimelineItem } from '../../../../common/search_strategy';
import { getAlertsDefaultModel } from '../../components/alerts_table/default_config';
import { TableId } from '../../../../common/types';
import type { State } from '../../../common/store';
import { useUserData } from '../../components/user_info';
import { RowAction } from '../../../common/components/control_columns/row_action';

export const useActionsColumn: AlertsTableConfigurationRegistry['useActionsColumn'] = (
  ecsData,
  oldAlertsData
) => {
  const license = useLicense();
  const dispatch = useDispatch();
  const isEnterprisePlus = license.isEnterprise();
  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 5 : 4;

  const timelineItems: TimelineItem[] = (ecsData as Ecs[]).map((ecsItem, index) => ({
    _id: ecsItem._id,
    _index: ecsItem._index,
    ecs: ecsItem,
    data: oldAlertsData ? oldAlertsData[index] : [],
  }));

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
  } = useSelector((state: State) => eventsViewerSelector(state, TableId.alertsOnAlertsPage));

  const [{ hasIndexWrite = false, hasIndexMaintenance = false }] = useUserData();

  const hasCrudPermissions = useMemo(
    () => hasIndexWrite && hasIndexMaintenance,
    [hasIndexMaintenance, hasIndexWrite]
  );

  const selectedCount = useMemo(() => Object.keys(selectedEventIds).length, [selectedEventIds]);

  // const onRowSelected: OnRowSelected = useCallback(
  // ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) => {
  // setSelected({
  // id: TableId.alertsOnAlertsPage,
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
    }) => {
      return (
        <RowAction
          columnId={`actions-${rowIndex}`}
          columnHeaders={columnHeaders}
          controlColumn={leadingControlColumns[0]}
          data={timelineItems[rowIndex]}
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
          tableId={TableId.alertsOnAlertsPage}
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
