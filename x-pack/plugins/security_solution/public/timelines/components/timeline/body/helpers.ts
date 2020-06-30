/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get, isEmpty, noop } from 'lodash/fp';
import { Dispatch } from 'redux';

import { Ecs, TimelineItem, TimelineNonEcsData } from '../../../../graphql/types';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../helpers';
import { updateTimelineGraphEventId } from '../../../store/timeline/actions';
import { EventType } from '../../../../timelines/store/timeline/model';
import { OnPinEvent, OnUnPinEvent } from '../events';

import { TimelineRowAction, TimelineRowActionOnClick } from './actions';

import * as i18n from './translations';
import { TimelineTypeLiteral, TimelineType } from '../../../../../common/types/timeline';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const omitTypenameAndEmpty = (k: string, v: any): any | undefined =>
  k !== '__typename' && v != null ? v : undefined;

export const stringifyEvent = (ecs: Ecs): string => JSON.stringify(ecs, omitTypenameAndEmpty, 2);

export const eventHasNotes = (noteIds: string[]): boolean => !isEmpty(noteIds);

export const getPinTooltip = ({
  isPinned,
  // eslint-disable-next-line no-shadow
  eventHasNotes,
  timelineType,
}: {
  isPinned: boolean;
  eventHasNotes: boolean;
  timelineType: TimelineTypeLiteral;
}) =>
  timelineType === TimelineType.template
    ? i18n.DISABLE_PIN
    : isPinned && eventHasNotes
    ? i18n.PINNED_WITH_NOTES
    : isPinned
    ? i18n.PINNED
    : i18n.UNPINNED;

export interface IsPinnedParams {
  eventId: string;
  pinnedEventIds: Readonly<Record<string, boolean>>;
}

export const eventIsPinned = ({ eventId, pinnedEventIds }: IsPinnedParams): boolean =>
  pinnedEventIds[eventId] === true;

export interface GetPinOnClickParams {
  allowUnpinning: boolean;
  eventId: string;
  onPinEvent: OnPinEvent;
  onUnPinEvent: OnUnPinEvent;
  isEventPinned: boolean;
}

export const getPinOnClick = ({
  allowUnpinning,
  eventId,
  onPinEvent,
  onUnPinEvent,
  isEventPinned,
}: GetPinOnClickParams): (() => void) => {
  if (!allowUnpinning) {
    return noop;
  }
  return isEventPinned ? () => onUnPinEvent(eventId) : () => onPinEvent(eventId);
};

/**
 * Creates mapping of eventID -> fieldData for given fieldsToKeep. Used to store additional field
 * data necessary for custom timeline actions in conjunction with selection state
 * @param timelineData
 * @param eventIds
 * @param fieldsToKeep
 */
export const getEventIdToDataMapping = (
  timelineData: TimelineItem[],
  eventIds: string[],
  fieldsToKeep: string[]
): Record<string, TimelineNonEcsData[]> => {
  return timelineData.reduce((acc, v) => {
    const fvm = eventIds.includes(v._id)
      ? { [v._id]: v.data.filter((ti) => fieldsToKeep.includes(ti.field)) }
      : {};
    return {
      ...acc,
      ...fvm,
    };
  }, {});
};

/** Return eventType raw or signal */
export const getEventType = (event: Ecs): Omit<EventType, 'all'> => {
  if (!isEmpty(event.signal?.rule?.id)) {
    return 'signal';
  }
  return 'raw';
};

export const showGraphView = (graphEventId?: string) =>
  graphEventId != null && graphEventId.length > 0;

export const isInvestigateInResolverActionEnabled = (ecsData?: Ecs) => {
  return (
    get(['agent', 'type', 0], ecsData) === 'endpoint' &&
    get(['process', 'entity_id'], ecsData)?.length > 0
  );
};

export const getInvestigateInResolverAction = ({
  dispatch,
  timelineId,
}: {
  dispatch: Dispatch;
  timelineId: string;
}): TimelineRowAction => ({
  ariaLabel: i18n.ACTION_INVESTIGATE_IN_RESOLVER,
  content: i18n.ACTION_INVESTIGATE_IN_RESOLVER,
  dataTestSubj: 'investigate-in-resolver',
  displayType: 'icon',
  iconType: 'node',
  id: 'investigateInResolver',
  isActionDisabled: (ecsData?: Ecs) => !isInvestigateInResolverActionEnabled(ecsData),
  onClick: ({ eventId }: TimelineRowActionOnClick) =>
    dispatch(updateTimelineGraphEventId({ id: timelineId, graphEventId: eventId })),
  width: DEFAULT_ICON_BUTTON_WIDTH,
});
