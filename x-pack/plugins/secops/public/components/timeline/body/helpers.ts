/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEmpty, noop } from 'lodash/fp';

import { Ecs } from '../../../graphql/types';
import { OnPinEvent, OnUnPinEvent } from '../events';
import * as i18n from './translations';

export const ACTIONS_COLUMN_WIDTH = 100; // px;

// tslint:disable-next-line:no-any
export const omitTypenameAndEmpty = (k: string, v: any): any | undefined =>
  k !== '__typename' && v != null ? v : undefined;

export const stringifyEvent = (ecs: Ecs): string => JSON.stringify(ecs, omitTypenameAndEmpty, 2);

export const eventHasNotes = (noteIds: string[]): boolean => !isEmpty(noteIds);

export const getPinTooltip = ({
  isPinned,
  // tslint:disable-next-line:no-shadowed-variable
  eventHasNotes,
}: {
  isPinned: boolean;
  eventHasNotes: boolean;
}) => (isPinned && eventHasNotes ? i18n.PINNED_WITH_NOTES : isPinned ? i18n.PINNED : i18n.UNPINNED);

export interface IsPinnedParams {
  eventId: string;
  pinnedEventIds: { [eventId: string]: boolean };
}

export const eventIsPinned = ({ eventId, pinnedEventIds }: IsPinnedParams): boolean =>
  pinnedEventIds[eventId] === true;

export interface GetPinOnClickParams {
  allowUnpinning: boolean;
  eventId: string;
  onPinEvent: OnPinEvent;
  onUnPinEvent: OnUnPinEvent;
  pinnedEventIds: { [eventId: string]: boolean };
}

export const getPinOnClick = ({
  allowUnpinning,
  eventId,
  onPinEvent,
  onUnPinEvent,
  pinnedEventIds,
}: GetPinOnClickParams): (() => void) => {
  if (!allowUnpinning) {
    return noop;
  }

  return eventIsPinned({ eventId, pinnedEventIds })
    ? () => onUnPinEvent(eventId)
    : () => onPinEvent(eventId);
};
