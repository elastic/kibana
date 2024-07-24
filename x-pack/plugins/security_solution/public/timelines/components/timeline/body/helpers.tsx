/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { TimelineItem, TimelineNonEcsData } from '../../../../../common/search_strategy';
import type { TimelineEventsType } from '../../../../../common/types/timeline';
import type { TimelineTypeLiteral } from '../../../../../common/api/timeline';
import { TimelineType } from '../../../../../common/api/timeline';
import type { OnPinEvent, OnUnPinEvent } from '../events';
import * as i18n from './translations';

export const eventHasNotes = (noteIds: string[]): boolean => !isEmpty(noteIds);

export const getPinTooltip = ({
  isAlert,
  isPinned,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  eventHasNotes,
  timelineType,
}: {
  isAlert: boolean;
  isPinned: boolean;
  eventHasNotes: boolean;
  timelineType: TimelineTypeLiteral;
}) => {
  if (timelineType === TimelineType.template) {
    return i18n.DISABLE_PIN(isAlert);
  } else if (eventHasNotes) {
    return i18n.PINNED_WITH_NOTES(isAlert);
  } else if (isPinned) {
    return i18n.PINNED(isAlert);
  } else {
    return i18n.UNPINNED(isAlert);
  }
};

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
}: GetPinOnClickParams) => {
  if (!allowUnpinning) {
    return;
  }

  if (isEventPinned) {
    onUnPinEvent(eventId);
  } else {
    onPinEvent(eventId);
  }
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
): Record<string, TimelineNonEcsData[]> =>
  timelineData.reduce((acc, v) => {
    const fvm = eventIds.includes(v._id)
      ? { [v._id]: v.data.filter((ti) => fieldsToKeep.includes(ti.field)) }
      : {};
    return {
      ...acc,
      ...fvm,
    };
  }, {});

export const isEventBuildingBlockType = (event: Ecs): boolean =>
  !isEmpty(event.kibana?.alert?.building_block_type);

export const isEvenEqlSequence = (event: Ecs): boolean => {
  if (!isEmpty(event.eql?.sequenceNumber)) {
    try {
      const sequenceNumber = (event.eql?.sequenceNumber ?? '').split('-')[0];
      return parseInt(sequenceNumber, 10) % 2 === 0;
    } catch {
      return false;
    }
  }
  return false;
};
/** Return eventType raw or signal or eql */
export const getEventType = (event: Ecs): Omit<TimelineEventsType, 'all'> => {
  if (!isEmpty(event?.kibana?.alert?.rule?.uuid)) {
    return 'signal';
  } else if (!isEmpty(event?.eql?.parentId)) {
    return 'eql';
  }
  return 'raw';
};

export const NOTE_CONTENT_CLASS_NAME = 'note-content';
