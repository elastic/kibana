/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEmpty, noop } from 'lodash/fp';

import { Ecs } from '../../../graphql/types';
import { OnPinEvent, OnUnPinEvent } from '../events';

import * as i18n from './translations';

/** The (fixed) width of the Actions column */
export const ACTIONS_COLUMN_WIDTH = 150; // px;
/** The default minimum width of a column (when a width for the column type is not specified) */
export const DEFAULT_COLUMN_MIN_WIDTH = 180; // px
/** The default minimum width of a column of type `date` */
export const DEFAULT_DATE_COLUMN_MIN_WIDTH = 240; // px

export const DEFAULT_TIMELINE_WIDTH = 1100; // px

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const omitTypenameAndEmpty = (k: string, v: any): any | undefined =>
  k !== '__typename' && v != null ? v : undefined;

export const stringifyEvent = (ecs: Ecs): string => JSON.stringify(ecs, omitTypenameAndEmpty, 2);

export const eventHasNotes = (noteIds: string[]): boolean => !isEmpty(noteIds);

export const getPinTooltip = ({
  isPinned,
  // eslint-disable-next-line no-shadow
  eventHasNotes,
}: {
  isPinned: boolean;
  eventHasNotes: boolean;
}) => (isPinned && eventHasNotes ? i18n.PINNED_WITH_NOTES : isPinned ? i18n.PINNED : i18n.UNPINNED);

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
  pinnedEventIds: Readonly<Record<string, boolean>>;
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

export const getColumnWidthFromType = (type: string): number =>
  type !== 'date' ? DEFAULT_COLUMN_MIN_WIDTH : DEFAULT_DATE_COLUMN_MIN_WIDTH;
