/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect } from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { SortColumnTable } from '@kbn/securitysolution-data-table';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { JEST_ENVIRONMENT } from '../../../../../../common/constants';
import { useLicense } from '../../../../../common/hooks/use_license';
import { SourcererScopeName } from '../../../../../sourcerer/store/model';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { getDefaultControlColumn } from '../../body/control_columns';
import type { UnifiedActionProps } from '../../unified_components/data_table/control_column_cell_render';
import type { TimelineTabs } from '../../../../../../common/types/timeline';
import { HeaderActions } from '../../../../../common/components/header_actions/header_actions';
import { TimelineControlColumnCellRender } from '../../unified_components/data_table/control_column_cell_render';
import type { ColumnHeaderOptions } from '../../../../../../common/types';
import { useTimelineColumns } from './use_timeline_columns';
import type { UnifiedTimelineDataGridCellContext } from '../../types';
import { useTimelineUnifiedDataTableContext } from '../../unified_components/data_table/use_timeline_unified_data_table_context';

interface UseTimelineControlColumnArgs {
  columns: ColumnHeaderOptions[];
  sort: SortColumnTable[];
  timelineId: string;
  activeTab: TimelineTabs;
  refetch: () => void;
  events: TimelineItem[];
  pinnedEventIds: Record<string, boolean>;
  eventIdToNoteIds: Record<string, string[]>;
  onToggleShowNotes: (eventId?: string) => void;
}

const EMPTY_STRING_ARRAY: string[] = [];

const noOp = () => {};
const noSelectAll = ({ isSelected }: { isSelected: boolean }) => {};
export const useTimelineControlColumn = ({
  columns,
  sort,
  timelineId,
  activeTab,
  refetch,
  events,
  pinnedEventIds,
  eventIdToNoteIds,
  onToggleShowNotes,
}: UseTimelineControlColumnArgs) => {
  const { browserFields } = useSourcererDataView(SourcererScopeName.timeline);

  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = useMemo(() => (isEnterprisePlus ? 6 : 5), [isEnterprisePlus]);
  const { localColumns } = useTimelineColumns(columns);

  const RowCellRender = useMemo(
    () =>
      function TimelineControlColumnCellRenderer(
        props: EuiDataGridCellValueElementProps & UnifiedTimelineDataGridCellContext
      ) {
        const ctx = useTimelineUnifiedDataTableContext();

        useEffect(() => {
          props.setCellProps({
            className:
              ctx.expanded?.id === events[props.rowIndex]?._id
                ? 'unifiedDataTable__cell--expanded'
                : '',
          });
        });

        /*
         * In some cases, when number of events is updated
         * but new table is not yet rendered it can result
         * in the mismatch between the number of events v/s
         * the number of rows in the table currently rendered.
         *
         * */
        if ('rowIndex' in props && props.rowIndex >= events.length) return <></>;
        return (
          <TimelineControlColumnCellRender
            rowIndex={props.rowIndex}
            columnId={props.columnId}
            timelineId={timelineId}
            ariaRowindex={props.rowIndex}
            checked={false}
            columnValues=""
            data={events[props.rowIndex].data}
            ecsData={events[props.rowIndex].ecs}
            loadingEventIds={EMPTY_STRING_ARRAY}
            eventId={events[props.rowIndex]?._id}
            index={props.rowIndex}
            onEventDetailsPanelOpened={noOp}
            onRowSelected={noOp}
            refetch={refetch}
            showCheckboxes={false}
            setEventsLoading={noOp}
            setEventsDeleted={noOp}
            pinnedEventIds={pinnedEventIds}
            eventIdToNoteIds={eventIdToNoteIds}
            toggleShowNotes={onToggleShowNotes}
          />
        );
      },
    [events, timelineId, refetch, pinnedEventIds, eventIdToNoteIds, onToggleShowNotes]
  );

  // We need one less when the unified components are enabled because the document expand is provided by the unified data table
  const UNIFIED_COMPONENTS_ACTION_BUTTON_COUNT = ACTION_BUTTON_COUNT - 1;
  return useMemo(() => {
    return getDefaultControlColumn(UNIFIED_COMPONENTS_ACTION_BUTTON_COUNT).map((x) => ({
      ...x,
      headerCellRender: function HeaderCellRender(props: UnifiedActionProps) {
        return (
          <HeaderActions
            width={x.width}
            browserFields={browserFields}
            columnHeaders={localColumns}
            isEventViewer={false}
            isSelectAllChecked={false}
            onSelectAll={noSelectAll}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            showFullScreenToggle={false}
            sort={sort}
            tabType={activeTab}
            {...props}
            timelineId={timelineId}
          />
        );
      },
      rowCellRender: JEST_ENVIRONMENT ? RowCellRender : React.memo(RowCellRender),
    }));
  }, [
    UNIFIED_COMPONENTS_ACTION_BUTTON_COUNT,
    browserFields,
    localColumns,
    sort,
    activeTab,
    timelineId,
    RowCellRender,
  ]);
};
