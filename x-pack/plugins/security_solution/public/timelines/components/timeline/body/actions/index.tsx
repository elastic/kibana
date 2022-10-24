/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { EuiButtonIcon, EuiCheckbox, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { noop } from 'lodash/fp';
import styled from 'styled-components';

import { DEFAULT_ACTION_BUTTON_WIDTH } from '@kbn/timelines-plugin/public';
import { GuidedOnboardingTourStep } from '../../../../../common/components/guided_onboarding/tour_step';
import { isDetectionsAlertsTable } from '../../../../../common/components/top_n/helpers';
import { useTourContext } from '../../../../../common/components/guided_onboarding';
import { SecurityStepId } from '../../../../../common/components/guided_onboarding/tour_config';
import { getScopedActions, isTimelineScope } from '../../../../../helpers';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { eventHasNotes, getEventType, getPinOnClick } from '../helpers';
import { AlertContextMenu } from '../../../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { InvestigateInTimelineAction } from '../../../../../detections/components/alerts_table/timeline_actions/investigate_in_timeline_action';
import { AddEventNoteAction } from './add_note_icon_item';
import { PinEventAction } from './pin_event_action';
import { EventsTdContent } from '../../styles';
import * as i18n from '../translations';
import { useShallowEqualSelector } from '../../../../../common/hooks/use_selector';
import { setActiveTabTimeline } from '../../../../store/timeline/actions';
import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../../../common/containers/use_full_screen';
import type {
  ActionProps,
  OnPinEvent,
  TimelineEventsType,
} from '../../../../../../common/types/timeline';
import { TableId, TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { timelineActions, timelineSelectors } from '../../../../store/timeline';
import { timelineDefaults } from '../../../../store/timeline/defaults';
import { isInvestigateInResolverActionEnabled } from '../../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { useStartTransaction } from '../../../../../common/lib/apm/use_start_transaction';
import { ALERTS_ACTIONS } from '../../../../../common/lib/apm/user_actions';
import { useLicense } from '../../../../../common/hooks/use_license';

export const isAlert = (eventType: TimelineEventsType | Omit<TimelineEventsType, 'all'>): boolean =>
  eventType === 'signal';

const ActionsContainer = styled.div`
  align-items: center;
  display: flex;
`;

const ActionsComponent: React.FC<ActionProps> = ({
  ariaRowindex,
  checked,
  columnValues,
  ecsData,
  eventId,
  eventIdToNoteIds,
  isEventPinned = false,
  isEventViewer = false,
  loadingEventIds,
  onEventDetailsPanelOpened,
  onRowSelected,
  onRuleChange,
  refetch,
  showCheckboxes,
  showNotes,
  timelineId,
  toggleShowNotes,
}) => {
  const dispatch = useDispatch();
  const tGridEnabled = useIsExperimentalFeatureEnabled('tGridEnabled');
  const emptyNotes: string[] = [];
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const timelineType = useShallowEqualSelector(
    (state) =>
      (isTimelineScope(timelineId) ? getTimeline(state, timelineId) : timelineDefaults).timelineType
  );
  const { startTransaction } = useStartTransaction();

  const isEnterprisePlus = useLicense().isEnterprise();

  const onPinEvent: OnPinEvent = useCallback(
    (evtId) => dispatch(timelineActions.pinEvent({ id: timelineId, eventId: evtId })),
    [dispatch, timelineId]
  );

  const onUnPinEvent: OnPinEvent = useCallback(
    (evtId) => dispatch(timelineActions.unPinEvent({ id: timelineId, eventId: evtId })),
    [dispatch, timelineId]
  );

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
        allowUnpinning: eventIdToNoteIds ? !eventHasNotes(eventIdToNoteIds[eventId]) : true,
        eventId,
        onPinEvent,
        onUnPinEvent,
        isEventPinned,
      }),
    [eventIdToNoteIds, eventId, isEventPinned, onPinEvent, onUnPinEvent]
  );
  const eventType = getEventType(ecsData);

  const isContextMenuDisabled = useMemo(() => {
    return (
      eventType !== 'signal' &&
      !(ecsData.event?.kind?.includes('event') && ecsData.agent?.type?.includes('endpoint'))
    );
  }, [ecsData, eventType]);

  const isDisabled = useMemo(() => !isInvestigateInResolverActionEnabled(ecsData), [ecsData]);
  const { setGlobalFullScreen } = useGlobalFullScreen();
  const { setTimelineFullScreen } = useTimelineFullScreen();
  const scopedActions = getScopedActions(timelineId);
  const handleClick = useCallback(() => {
    startTransaction({ name: ALERTS_ACTIONS.OPEN_ANALYZER });

    const dataGridIsFullScreen = document.querySelector('.euiDataGrid--fullScreen');
    if (scopedActions) {
      dispatch(scopedActions.updateGraphEventId({ id: timelineId, graphEventId: ecsData._id }));
    }
    if (timelineId === TimelineId.active) {
      if (dataGridIsFullScreen) {
        setTimelineFullScreen(true);
      }
      dispatch(setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.graph }));
    } else {
      if (dataGridIsFullScreen) {
        setGlobalFullScreen(true);
      }
    }
  }, [
    startTransaction,
    scopedActions,
    timelineId,
    dispatch,
    ecsData._id,
    setTimelineFullScreen,
    setGlobalFullScreen,
  ]);

  const sessionViewConfig = useMemo(() => {
    const { process, _id, timestamp } = ecsData;
    const sessionEntityId = process?.entry_leader?.entity_id?.[0];

    if (sessionEntityId === undefined) {
      return null;
    }

    const jumpToEntityId = process?.entity_id?.[0];
    const investigatedAlertId = eventType === 'signal' || eventType === 'eql' ? _id : undefined;
    const jumpToCursor =
      (investigatedAlertId && ecsData.kibana?.alert.original_time?.[0]) || timestamp;

    return {
      sessionEntityId,
      jumpToEntityId,
      jumpToCursor,
      investigatedAlertId,
    };
  }, [ecsData, eventType]);

  const openSessionView = useCallback(() => {
    const dataGridIsFullScreen = document.querySelector('.euiDataGrid--fullScreen');
    startTransaction({ name: ALERTS_ACTIONS.OPEN_SESSION_VIEW });

    if (timelineId === TimelineId.active) {
      if (dataGridIsFullScreen) {
        setTimelineFullScreen(true);
      }
      if (sessionViewConfig !== null) {
        dispatch(setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.session }));
      }
    } else {
      if (dataGridIsFullScreen) {
        setGlobalFullScreen(true);
      }
    }
    if (sessionViewConfig !== null) {
      if (scopedActions) {
        dispatch(scopedActions.updateSessionViewConfig({ id: timelineId, sessionViewConfig }));
      }
    }
  }, [
    startTransaction,
    timelineId,
    sessionViewConfig,
    setTimelineFullScreen,
    dispatch,
    setGlobalFullScreen,
    scopedActions,
  ]);

  const { isTourShown, incrementStep } = useTourContext();

  const isTourAnchor = useMemo(
    () =>
      isTourShown(SecurityStepId.alertsCases) &&
      eventType === 'signal' &&
      // TODO: Steph make sure this is right
      isDetectionsAlertsTable(timelineId) &&
      ariaRowindex === 1,
    [isTourShown, ariaRowindex, eventType, timelineId]
  );

  const onExpandEvent = useCallback(() => {
    if (isTourAnchor) {
      incrementStep(SecurityStepId.alertsCases);
    }
    onEventDetailsPanelOpened();
  }, [incrementStep, isTourAnchor, onEventDetailsPanelOpened]);

  return (
    <ActionsContainer>
      {showCheckboxes && !tGridEnabled && (
        <div key="select-event-container" data-test-subj="select-event-container">
          <EventsTdContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
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
      <GuidedOnboardingTourStep
        isTourAnchor={isTourAnchor}
        step={2}
        stepId={SecurityStepId.alertsCases}
      >
        <div key="expand-event">
          <EventsTdContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
            <EuiToolTip data-test-subj="expand-event-tool-tip" content={i18n.VIEW_DETAILS}>
              <EuiButtonIcon
                aria-label={i18n.VIEW_DETAILS_FOR_ROW({ ariaRowindex, columnValues })}
                data-test-subj="expand-event"
                iconType="expand"
                onClick={onExpandEvent}
                size="s"
              />
            </EuiToolTip>
          </EventsTdContent>
        </div>
      </GuidedOnboardingTourStep>
      <>
        {timelineId !== TimelineId.active && (
          <InvestigateInTimelineAction
            ariaLabel={i18n.SEND_ALERT_TO_TIMELINE_FOR_ROW({ ariaRowindex, columnValues })}
            key="investigate-in-timeline"
            ecsRowData={ecsData}
          />
        )}

        {!isEventViewer && toggleShowNotes && (
          <>
            <AddEventNoteAction
              ariaLabel={i18n.ADD_NOTES_FOR_ROW({ ariaRowindex, columnValues })}
              key="add-event-note"
              showNotes={showNotes ?? false}
              toggleShowNotes={toggleShowNotes}
              timelineType={timelineType}
            />
            <PinEventAction
              ariaLabel={i18n.PIN_EVENT_FOR_ROW({ ariaRowindex, columnValues, isEventPinned })}
              isAlert={isAlert(eventType)}
              key="pin-event"
              onPinClicked={handlePinClicked}
              noteIds={eventIdToNoteIds ? eventIdToNoteIds[eventId] || emptyNotes : emptyNotes}
              eventIsPinned={isEventPinned}
              timelineType={timelineType}
            />
          </>
        )}
        <AlertContextMenu
          ariaLabel={i18n.MORE_ACTIONS_FOR_ROW({ ariaRowindex, columnValues })}
          ariaRowindex={ariaRowindex}
          columnValues={columnValues}
          key="alert-context-menu"
          ecsRowData={ecsData}
          scopeId={timelineId}
          disabled={isContextMenuDisabled}
          refetch={refetch ?? noop}
          onRuleChange={onRuleChange}
        />
        {isDisabled === false ? (
          <div>
            <EventsTdContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
              <EuiToolTip
                data-test-subj="view-in-analyzer-tool-tip"
                content={i18n.ACTION_INVESTIGATE_IN_RESOLVER}
              >
                <EuiButtonIcon
                  aria-label={i18n.ACTION_INVESTIGATE_IN_RESOLVER_FOR_ROW({
                    ariaRowindex,
                    columnValues,
                  })}
                  data-test-subj="view-in-analyzer"
                  iconType="analyzeEvent"
                  onClick={handleClick}
                  size="s"
                />
              </EuiToolTip>
            </EventsTdContent>
          </div>
        ) : null}
        {sessionViewConfig !== null &&
        (isEnterprisePlus || timelineId === TableId.kubernetesPageSessions) ? (
          <div>
            <EventsTdContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
              <EuiToolTip data-test-subj="expand-event-tool-tip" content={i18n.OPEN_SESSION_VIEW}>
                <EuiButtonIcon
                  aria-label={i18n.VIEW_DETAILS_FOR_ROW({ ariaRowindex, columnValues })}
                  data-test-subj="session-view-button"
                  iconType="sessionViewer"
                  onClick={openSessionView}
                  size="s"
                />
              </EuiToolTip>
            </EventsTdContent>
          </div>
        ) : null}
      </>
    </ActionsContainer>
  );
};

ActionsComponent.displayName = 'ActionsComponent';

export const Actions = React.memo(ActionsComponent);
