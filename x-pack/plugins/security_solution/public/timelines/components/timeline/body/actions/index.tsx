/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { useSelector } from 'react-redux';
import { EuiButtonIcon, EuiCheckbox, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';

import { Note } from '../../../../../common/lib/note';
import { StoreState } from '../../../../../common/store/types';
import { TimelineType } from '../../../../../../common/types/timeline';

import { TimelineModel } from '../../../../store/timeline/model';

import { AssociateNote, UpdateNote } from '../../../notes/helpers';
import { Pin } from '../../pin';
import { NotesButton } from '../../properties/helpers';
import { EventsLoading, EventsTd, EventsTdContent, EventsTdGroupActions } from '../../styles';
import { eventHasNotes, getPinTooltip } from '../helpers';
import * as i18n from '../translations';
import { OnRowSelected } from '../../events';
import { Ecs, TimelineNonEcsData } from '../../../../../graphql/types';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../helpers';

export interface TimelineRowActionOnClick {
  eventId: string;
  ecsData: Ecs;
  data: TimelineNonEcsData[];
}

export interface TimelineRowAction {
  ariaLabel?: string;
  dataTestSubj?: string;
  displayType: 'icon' | 'contextMenu';
  iconType?: string;
  id: string;
  isActionDisabled?: (ecsData?: Ecs) => boolean;
  onClick: ({ eventId, ecsData }: TimelineRowActionOnClick) => void;
  content: string | JSX.Element;
  width?: number;
}

interface Props {
  actionsColumnWidth: number;
  additionalActions?: JSX.Element[];
  associateNote: AssociateNote;
  checked: boolean;
  onRowSelected: OnRowSelected;
  expanded: boolean;
  eventId: string;
  eventIsPinned: boolean;
  getNotesByIds: (noteIds: string[]) => Note[];
  isEventViewer?: boolean;
  loading: boolean;
  loadingEventIds: Readonly<string[]>;
  noteIds: string[];
  onEventToggled: () => void;
  onPinClicked: () => void;
  showNotes: boolean;
  showCheckboxes: boolean;
  toggleShowNotes: () => void;
  updateNote: UpdateNote;
}

const emptyNotes: string[] = [];

export const Actions = React.memo<Props>(
  ({
    actionsColumnWidth,
    additionalActions,
    associateNote,
    checked,
    expanded,
    eventId,
    eventIsPinned,
    getNotesByIds,
    isEventViewer = false,
    loading = false,
    loadingEventIds,
    noteIds,
    onEventToggled,
    onPinClicked,
    onRowSelected,
    showCheckboxes,
    showNotes,
    toggleShowNotes,
    updateNote,
  }) => {
    const timeline = useSelector<StoreState, TimelineModel>((state) => {
      return state.timeline.timelineById['timeline-1'];
    });
    return (
      <EventsTdGroupActions
        actionsColumnWidth={actionsColumnWidth}
        data-test-subj="event-actions-container"
      >
        {showCheckboxes && (
          <EventsTd key="select-event-container" data-test-subj="select-event-container">
            <EventsTdContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
              {loadingEventIds.includes(eventId) ? (
                <EuiLoadingSpinner size="m" data-test-subj="event-loader" />
              ) : (
                <EuiCheckbox
                  data-test-subj="select-event"
                  id={eventId}
                  checked={checked}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    onRowSelected({
                      eventIds: [eventId],
                      isSelected: event.currentTarget.checked,
                    });
                  }}
                />
              )}
            </EventsTdContent>
          </EventsTd>
        )}

        <EventsTd key="expand-event">
          <EventsTdContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
            {loading ? (
              <EventsLoading />
            ) : (
              <EuiButtonIcon
                aria-label={expanded ? i18n.COLLAPSE : i18n.EXPAND}
                data-test-subj="expand-event"
                iconType={expanded ? 'arrowDown' : 'arrowRight'}
                id={eventId}
                onClick={onEventToggled}
              />
            )}
          </EventsTdContent>
        </EventsTd>

        <>{additionalActions}</>

        {!isEventViewer && (
          <>
            <EventsTd key="timeline-action-pin-tool-tip">
              <EventsTdContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
                <EuiToolTip
                  data-test-subj="timeline-action-pin-tool-tip"
                  content={getPinTooltip({
                    isPinned: eventIsPinned,
                    eventHasNotes: eventHasNotes(noteIds),
                    timelineType: timeline.timelineType,
                  })}
                >
                  <Pin
                    allowUnpinning={!eventHasNotes(noteIds)}
                    data-test-subj="pin-event"
                    onClick={onPinClicked}
                    pinned={eventIsPinned}
                    timelineType={timeline.timelineType}
                  />
                </EuiToolTip>
              </EventsTdContent>
            </EventsTd>

            <EventsTd key="add-note">
              <EventsTdContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
                <NotesButton
                  animate={false}
                  associateNote={associateNote}
                  data-test-subj="add-note"
                  getNotesByIds={getNotesByIds}
                  noteIds={noteIds || emptyNotes}
                  showNotes={showNotes}
                  size="s"
                  status={timeline.status}
                  timelineType={timeline.timelineType}
                  toggleShowNotes={toggleShowNotes}
                  toolTip={
                    timeline.timelineType === TimelineType.template
                      ? i18n.NOTES_DISABLE_TOOLTIP
                      : i18n.NOTES_TOOLTIP
                  }
                  updateNote={updateNote}
                />
              </EventsTdContent>
            </EventsTd>
          </>
        )}
      </EventsTdGroupActions>
    );
  },
  (nextProps, prevProps) => {
    return (
      prevProps.actionsColumnWidth === nextProps.actionsColumnWidth &&
      prevProps.additionalActions === nextProps.additionalActions &&
      prevProps.checked === nextProps.checked &&
      prevProps.expanded === nextProps.expanded &&
      prevProps.eventId === nextProps.eventId &&
      prevProps.eventIsPinned === nextProps.eventIsPinned &&
      prevProps.loading === nextProps.loading &&
      prevProps.loadingEventIds === nextProps.loadingEventIds &&
      prevProps.noteIds === nextProps.noteIds &&
      prevProps.onRowSelected === nextProps.onRowSelected &&
      prevProps.showCheckboxes === nextProps.showCheckboxes &&
      prevProps.showNotes === nextProps.showNotes
    );
  }
);
Actions.displayName = 'Actions';
