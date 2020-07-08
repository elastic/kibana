/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';
import uuid from 'uuid';

import {
  EuiButtonIcon,
  EuiToolTip,
  EuiContextMenuPanel,
  EuiPopover,
  EuiContextMenuItem,
} from '@elastic/eui';
import styled from 'styled-components';
import { TimelineNonEcsData, Ecs } from '../../../../../graphql/types';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../helpers';
import { Note } from '../../../../../common/lib/note';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import { AssociateNote, UpdateNote } from '../../../notes/helpers';
import { OnColumnResized, OnPinEvent, OnRowSelected, OnUnPinEvent } from '../../events';
import { EventsTdContent, EventsTrData } from '../../styles';
import { Actions } from '../actions';
import { DataDrivenColumns } from '../data_driven_columns';
import { eventHasNotes, getPinOnClick } from '../helpers';
import { ColumnRenderer } from '../renderers/column_renderer';
import { useManageTimeline } from '../../../manage_timeline';

interface Props {
  id: string;
  actionsColumnWidth: number;
  associateNote: AssociateNote;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  expanded: boolean;
  getNotesByIds: (noteIds: string[]) => Note[];
  isEventPinned: boolean;
  isEventViewer?: boolean;
  loading: boolean;
  loadingEventIds: Readonly<string[]>;
  onColumnResized: OnColumnResized;
  onEventToggled: () => void;
  onPinEvent: OnPinEvent;
  onRowSelected: OnRowSelected;
  onUnPinEvent: OnUnPinEvent;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  showNotes: boolean;
  timelineId: string;
  toggleShowNotes: () => void;
  updateNote: UpdateNote;
}

export const getNewNoteId = (): string => uuid.v4();

const emptyNotes: string[] = [];

export const EventColumnView = React.memo<Props>(
  ({
    id,
    actionsColumnWidth,
    associateNote,
    columnHeaders,
    columnRenderers,
    data,
    ecsData,
    eventIdToNoteIds,
    expanded,
    getNotesByIds,
    isEventPinned = false,
    isEventViewer = false,
    loading,
    loadingEventIds,
    onColumnResized,
    onEventToggled,
    onPinEvent,
    onRowSelected,
    onUnPinEvent,
    selectedEventIds,
    showCheckboxes,
    showNotes,
    timelineId,
    toggleShowNotes,
    updateNote,
  }) => {
    const { getManageTimelineById } = useManageTimeline();
    const timelineActions = useMemo(
      () => getManageTimelineById(timelineId).timelineRowActions(ecsData),
      [ecsData, getManageTimelineById, timelineId]
    );
    const [isPopoverOpen, setPopover] = useState(false);

    const onButtonClick = useCallback(() => {
      setPopover(!isPopoverOpen);
    }, [isPopoverOpen]);

    const closePopover = useCallback(() => {
      setPopover(false);
    }, []);

    const button = (
      <EuiButtonIcon
        aria-label="context menu"
        data-test-subj="timeline-context-menu-button"
        size="s"
        iconType="boxesHorizontal"
        onClick={onButtonClick}
      />
    );

    const onClickCb = useCallback((cb: () => void) => {
      cb();
      closePopover();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const additionalActions = useMemo<JSX.Element[]>(() => {
      const grouped = timelineActions.reduce(
        (
          acc: {
            contextMenu: JSX.Element[];
            icon: JSX.Element[];
          },
          action
        ) => {
          if (action.displayType === 'icon') {
            return {
              ...acc,
              icon: [
                ...acc.icon,
                <EventsTdContent key={action.id} textAlign="center" width={action.width}>
                  <EuiToolTip
                    data-test-subj={`${action.dataTestSubj}-tool-tip`}
                    content={action.content}
                  >
                    <EuiButtonIcon
                      aria-label={action.ariaLabel}
                      data-test-subj={`${action.dataTestSubj}-button`}
                      iconType={action.iconType}
                      isDisabled={
                        action.isActionDisabled != null ? action.isActionDisabled(ecsData) : false
                      }
                      onClick={() => action.onClick({ eventId: id, ecsData, data })}
                    />
                  </EuiToolTip>
                </EventsTdContent>,
              ],
            };
          }
          return {
            ...acc,
            contextMenu: [
              ...acc.contextMenu,
              <EuiContextMenuItem
                aria-label={action.ariaLabel}
                data-test-subj={action.dataTestSubj}
                disabled={
                  action.isActionDisabled != null ? action.isActionDisabled(ecsData) : false
                }
                icon={action.iconType}
                key={action.id}
                onClick={() => onClickCb(() => action.onClick({ eventId: id, ecsData, data }))}
              >
                {action.content}
              </EuiContextMenuItem>,
            ],
          };
        },
        { icon: [], contextMenu: [] }
      );
      return grouped.contextMenu.length > 0
        ? [
            ...grouped.icon,
            <EventsTdContent
              key="actions-context-menu"
              textAlign="center"
              width={DEFAULT_ICON_BUTTON_WIDTH}
            >
              <EuiPopover
                id="singlePanel"
                button={button}
                isOpen={isPopoverOpen}
                closePopover={closePopover}
                panelPaddingSize="none"
                anchorPosition="downLeft"
                repositionOnScroll
              >
                <ContextMenuPanel items={grouped.contextMenu} />
              </EuiPopover>
            </EventsTdContent>,
          ]
        : grouped.icon;
    }, [button, closePopover, id, onClickCb, data, ecsData, timelineActions, isPopoverOpen]);

    return (
      <EventsTrData data-test-subj="event-column-view">
        <Actions
          actionsColumnWidth={actionsColumnWidth}
          additionalActions={additionalActions}
          associateNote={associateNote}
          checked={Object.keys(selectedEventIds).includes(id)}
          onRowSelected={onRowSelected}
          expanded={expanded}
          data-test-subj="actions"
          eventId={id}
          eventIsPinned={isEventPinned}
          getNotesByIds={getNotesByIds}
          isEventViewer={isEventViewer}
          loading={loading}
          loadingEventIds={loadingEventIds}
          noteIds={eventIdToNoteIds[id] || emptyNotes}
          onEventToggled={onEventToggled}
          onPinClicked={getPinOnClick({
            allowUnpinning: !eventHasNotes(eventIdToNoteIds[id]),
            eventId: id,
            onPinEvent,
            onUnPinEvent,
            isEventPinned,
          })}
          showCheckboxes={showCheckboxes}
          showNotes={showNotes}
          toggleShowNotes={toggleShowNotes}
          updateNote={updateNote}
        />

        <DataDrivenColumns
          _id={id}
          columnHeaders={columnHeaders}
          columnRenderers={columnRenderers}
          data={data}
          ecsData={ecsData}
          onColumnResized={onColumnResized}
          timelineId={timelineId}
        />
      </EventsTrData>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.id === nextProps.id &&
      prevProps.actionsColumnWidth === nextProps.actionsColumnWidth &&
      prevProps.columnHeaders === nextProps.columnHeaders &&
      prevProps.columnRenderers === nextProps.columnRenderers &&
      prevProps.data === nextProps.data &&
      prevProps.eventIdToNoteIds === nextProps.eventIdToNoteIds &&
      prevProps.expanded === nextProps.expanded &&
      prevProps.loading === nextProps.loading &&
      prevProps.loadingEventIds === nextProps.loadingEventIds &&
      prevProps.isEventPinned === nextProps.isEventPinned &&
      prevProps.onRowSelected === nextProps.onRowSelected &&
      prevProps.selectedEventIds === nextProps.selectedEventIds &&
      prevProps.showCheckboxes === nextProps.showCheckboxes &&
      prevProps.showNotes === nextProps.showNotes &&
      prevProps.timelineId === nextProps.timelineId
    );
  }
);
const ContextMenuPanel = styled(EuiContextMenuPanel)`
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
`;

ContextMenuPanel.displayName = 'ContextMenuPanel';
