/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { useDispatch, useSelector } from 'react-redux';
import { type EuiDataGridCellValueElementProps, type EuiDataGridProps } from '@elastic/eui';
import type { State, inputsModel } from '../../../../../common/store';
import type {
  RowRenderer,
  SetEventsDeleted,
  SetEventsLoading,
} from '../../../../../../common/types';
import type { TimelineItem } from '../../../../../../common/search_strategy';
import { timelineBodySelector } from '../../body/selectors';
import { timelineActions } from '../../../../store';
import { useLicense } from '../../../../../common/hooks/use_license';
import { Actions } from '../../../../../common/components/header_actions/actions';
import { getDefaultControlColumn } from '../../body/control_columns';
import { eventIsPinned } from '../../body/helpers';
import { NOTES_BUTTON_CLASS_NAME } from '../../properties/helpers';
import { timelineDefaults } from '../../../../store/defaults';
import RowDetails from './row_details';

export interface UseControlColumns {
  enabledRowRenderers: RowRenderer[];
  expandedDoc: (DataTableRecord & TimelineItem) | undefined;
  gridRows: Array<DataTableRecord & TimelineItem>;
  refetch: inputsModel.Refetch;
  timelineId: string;
  trGroupRef: React.MutableRefObject<HTMLDivElement | null>;
}

export const useControlColumns = ({
  enabledRowRenderers,
  expandedDoc,
  gridRows,
  refetch,
  timelineId,
  trGroupRef,
}: UseControlColumns) => {
  const dispatch = useDispatch();
  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 6 : 5;

  const {
    timeline: {
      eventIdToNoteIds,
      loadingEventIds,
      selectedEventIds,
      pinnedEventIds,
      notesMap,
    } = timelineDefaults,
  } = useSelector((state: State) => timelineBodySelector(state, timelineId));

  const setEventsLoading = useCallback<SetEventsLoading>(
    ({ eventIds, isLoading }) => {
      dispatch(timelineActions.setEventsLoading({ id: timelineId, eventIds, isLoading }));
    },
    [dispatch, timelineId]
  );

  const setEventsDeleted = useCallback<SetEventsDeleted>(
    ({ eventIds, isDeleted }) => {
      dispatch(timelineActions.setEventsDeleted({ id: timelineId, eventIds, isDeleted }));
    },
    [dispatch, timelineId]
  );

  const toggleShowNotesEvent = useCallback(
    (eventId: string) => {
      const row = notesMap[eventId];
      if (row?.isAddingNote !== true) {
        dispatch(
          timelineActions.setNotesMap({
            id: timelineId,
            notesMap: {
              ...notesMap,
              [eventId]: { ...row, isAddingNote: true },
            },
          })
        );
        setTimeout(() => {
          const notesButtonElement = trGroupRef.current?.querySelector<HTMLButtonElement>(
            `.${NOTES_BUTTON_CLASS_NAME}`
          );
          notesButtonElement?.focus();
        }, 0);
      }
    },
    [notesMap, dispatch, timelineId]
  );

  const leadingControlColumns = useMemo(() => {
    return getDefaultControlColumn(ACTION_BUTTON_COUNT).map((column) => {
      return {
        ...column,
        headerCellProps: {
          ...column.headerCellProps,
        },
        rowCellRender: ({
          columnId,
          colIndex,
          rowIndex,
          setCellProps,
        }: EuiDataGridCellValueElementProps) => {
          const { id, ecs, data } = gridRows[rowIndex];
          const toggleNotes = () => toggleShowNotesEvent(id);

          return (
            <Actions
              ariaRowindex={rowIndex}
              columnId={columnId}
              data={data}
              index={colIndex}
              rowIndex={rowIndex}
              setEventsDeleted={setEventsDeleted}
              checked={Object.keys(selectedEventIds).includes(id)}
              isEventPinned={eventIsPinned({
                eventId: id,
                pinnedEventIds,
              })}
              columnValues={column.columnValues ?? ''}
              ecsData={ecs}
              eventId={id}
              expandedDoc={expandedDoc}
              setCellProps={setCellProps}
              eventIdToNoteIds={eventIdToNoteIds}
              loadingEventIds={loadingEventIds}
              onRowSelected={column.onRowSelected ? column.onRowSelected : () => {}}
              showCheckboxes={column.showCheckboxes ?? false}
              // showNotes={showNotes[id]}
              timelineId={timelineId}
              toggleShowNotes={toggleNotes}
              refetch={refetch}
              setEventsLoading={setEventsLoading}
              isUnifiedDataTable={true}
              onEventDetailsPanelOpened={() => {}}
            />
          );
        },
        headerCellRender: () => <></>,
      };
    });
  }, [
    ACTION_BUTTON_COUNT,
    gridRows,
    setEventsDeleted,
    selectedEventIds,
    pinnedEventIds,
    eventIdToNoteIds,
    loadingEventIds,
    timelineId,
    refetch,
    setEventsLoading,
    expandedDoc,
    toggleShowNotesEvent,
  ]);

  // The custom row details is actually a trailing control column cell with
  // a hidden header. This is important for accessibility and markup reasons
  // @see https://fuschia-stretch.glitch.me/ for more
  const expandedRowTrailingColumns: EuiDataGridProps['trailingControlColumns'] = useMemo(
    () => [
      {
        id: 'timeline-unified-data-table-expanded-row',
        width: 0, // The header cell should be visually hidden, but available to screen readers
        headerCellRender: () => <></>,
        headerCellProps: { className: 'euiScreenReaderOnly' },
        // The footer cell can be hidden to both visual & SR users, as it does not contain meaningful information
        footerCellProps: { style: { display: 'none' } },
        // When rendering this custom cell, we'll want to override
        // the automatic width/heights calculated by EuiDataGrid
        rowCellRender: ({ setCellProps, rowIndex }) => {
          return (
            <RowDetails
              event={gridRows[rowIndex]}
              rowIndex={rowIndex}
              setCellProps={setCellProps}
              timelineId={timelineId}
              enabledRowRenderers={enabledRowRenderers}
            />
          );
        },
      },
    ],
    [gridRows, timelineId, enabledRowRenderers]
  );

  return useMemo(
    () => ({ leadingControlColumns, expandedRowTrailingColumns }),
    [leadingControlColumns, expandedRowTrailingColumns]
  );
};
