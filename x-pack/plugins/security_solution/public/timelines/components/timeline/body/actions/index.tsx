/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonIcon, EuiCheckbox, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import {
  eventHasNotes,
  getEventType,
  getPinOnClick,
  InvestigateInResolverAction,
} from '../helpers';
import { AlertContextMenu } from '../../../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { InvestigateInTimelineAction } from '../../../../../detections/components/alerts_table/timeline_actions/investigate_in_timeline_action';
import { AddEventNoteAction } from '../actions/add_note_icon_item';
import { PinEventAction } from '../actions/pin_event_action';
import { EventsTdContent } from '../../styles';
import * as i18n from '../translations';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../helpers';
import { useShallowEqualSelector } from '../../../../../common/hooks/use_selector';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { AddToCaseAction } from '../../../../../cases/components/timeline_actions/add_to_case_action';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { timelineSelectors } from '../../../../store/timeline';
import { timelineDefaults } from '../../../../store/timeline/defaults';
import { Ecs } from '../../../../../../common/ecs';
import { inputsModel } from '../../../../../common/store';
import { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { OnPinEvent, OnRowSelected, OnUnPinEvent } from '../../events';
import { RowCellRender } from '../control_columns';

interface Props {
  ariaRowindex: number;
  action?: RowCellRender;
  width?: number;
  columnId: string;
  columnValues: string;
  checked: boolean;
  onRowSelected: OnRowSelected;
  eventId: string;
  loadingEventIds: Readonly<string[]>;
  onEventDetailsPanelOpened: () => void;
  showCheckboxes: boolean;
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  index: number;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  isEventPinned: boolean;
  isEventViewer?: boolean;
  onPinEvent: OnPinEvent;
  onUnPinEvent: OnUnPinEvent;
  refetch: inputsModel.Refetch;
  rowIndex: number;
  onRuleChange?: () => void;
  showNotes: boolean;
  tabType?: TimelineTabs;
  timelineId: string;
  toggleShowNotes: () => void;
}

export type ActionProps = Props;

const ActionsComponent: React.FC<ActionProps> = ({
  ariaRowindex,
  width,
  checked,
  columnValues,
  eventId,
  data,
  ecsData,
  eventIdToNoteIds,
  isEventPinned = false,
  isEventViewer = false,
  loadingEventIds,
  onEventDetailsPanelOpened,
  onPinEvent,
  onRowSelected,
  onUnPinEvent,
  refetch,
  onRuleChange,
  showCheckboxes,
  showNotes,
  timelineId,
  toggleShowNotes,
}) => {
  const emptyNotes: string[] = [];
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const isEventFilteringEnabled = useIsExperimentalFeatureEnabled('eventFilteringEnabled');

  const handleSelectEvent = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onRowSelected({
        eventIds: [eventId],
        isSelected: event.currentTarget.checked,
      }),
    [eventId, onRowSelected]
  );
  const handlePinClicked = useCallback(
    () =>
      getPinOnClick({
        allowUnpinning: !eventHasNotes(eventIdToNoteIds[eventId]),
        eventId,
        onPinEvent,
        onUnPinEvent,
        isEventPinned,
      }),
    [eventIdToNoteIds, eventId, isEventPinned, onPinEvent, onUnPinEvent]
  );
  const timelineType = useShallowEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).timelineType
  );
  const eventType = getEventType(ecsData);

  return (
    <>
      {showCheckboxes && (
        <div key="select-event-container" data-test-subj="select-event-container">
          <EventsTdContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
            {loadingEventIds.includes(eventId) ? (
              <EuiLoadingSpinner size="m" data-test-subj="event-loader" />
            ) : (
              <EuiCheckbox
                aria-label={i18n.CHECKBOX_FOR_ROW({ ariaRowindex, columnValues, checked })}
                data-test-subj="select-event"
                id={eventId}
                checked={checked}
                onChange={handleSelectEvent}
              />
            )}
          </EventsTdContent>
        </div>
      )}
      <div key="expand-event">
        <EventsTdContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
          <EuiToolTip data-test-subj="expand-event-tool-tip" content={i18n.VIEW_DETAILS}>
            <EuiButtonIcon
              aria-label={i18n.VIEW_DETAILS_FOR_ROW({ ariaRowindex, columnValues })}
              data-test-subj="expand-event"
              iconType="arrowRight"
              onClick={onEventDetailsPanelOpened}
            />
          </EuiToolTip>
        </EventsTdContent>
      </div>
      <>
        <InvestigateInResolverAction
          ariaLabel={i18n.ACTION_INVESTIGATE_IN_RESOLVER_FOR_ROW({ ariaRowindex, columnValues })}
          key="investigate-in-resolver"
          timelineId={timelineId}
          ecsData={ecsData}
        />
        {timelineId !== TimelineId.active && eventType === 'signal' && (
          <InvestigateInTimelineAction
            ariaLabel={i18n.SEND_ALERT_TO_TIMELINE_FOR_ROW({ ariaRowindex, columnValues })}
            key="investigate-in-timeline"
            ecsRowData={ecsData}
            nonEcsRowData={data}
          />
        )}

        {!isEventViewer && (
          <>
            <AddEventNoteAction
              ariaLabel={i18n.ADD_NOTES_FOR_ROW({ ariaRowindex, columnValues })}
              key="add-event-note"
              showNotes={showNotes}
              toggleShowNotes={toggleShowNotes}
              timelineType={timelineType}
            />
            <PinEventAction
              ariaLabel={i18n.PIN_EVENT_FOR_ROW({ ariaRowindex, columnValues, isEventPinned })}
              key="pin-event"
              onPinClicked={handlePinClicked}
              noteIds={eventIdToNoteIds[eventId] || emptyNotes}
              eventIsPinned={isEventPinned}
              timelineType={timelineType}
            />
          </>
        )}
        {[
          TimelineId.detectionsPage,
          TimelineId.detectionsRulesDetailsPage,
          TimelineId.active,
        ].includes(timelineId as TimelineId) && (
          <AddToCaseAction
            ariaLabel={i18n.ATTACH_ALERT_TO_CASE_FOR_ROW({ ariaRowindex, columnValues })}
            key="attach-to-case"
            ecsRowData={ecsData}
          />
        )}
        <AlertContextMenu
          ariaLabel={i18n.MORE_ACTIONS_FOR_ROW({ ariaRowindex, columnValues })}
          key="alert-context-menu"
          ecsRowData={ecsData}
          timelineId={timelineId}
          disabled={eventType !== 'signal' && (!isEventFilteringEnabled || eventType !== 'raw')}
          refetch={refetch}
          onRuleChange={onRuleChange}
        />
      </>
    </>
  );
};

ActionsComponent.displayName = 'ActionsComponent';

export const Actions = React.memo(ActionsComponent);
