/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PINNED_EVENTS_URL, PINNED_EVENT_URL } from '../../../../common/constants';
import {
  PinnedEvent,
  PinnedEventSavedObject,
} from '../../../../common/types/timeline/pinned_event';
import { KibanaServices } from '../../../common/lib/kibana';

export const getPinnedEventsByTimelineId = async (timelineId: string, signal: AbortSignal) => {
  const response = await KibanaServices.get().http.get<PinnedEventSavedObject[]>(
    PINNED_EVENTS_URL,
    {
      method: 'GET',
      query: {
        timelineId,
      },
      signal,
    }
  );
  return response;
};

export const persistPinnedEvent = async ({
  eventId,
  pinnedEventId,
  timelineId,
}: {
  eventId: string;
  pinnedEventId?: string | null;
  timelineId?: string | null;
}) => {
  const response = await KibanaServices.get().http.patch<PinnedEvent | null>(PINNED_EVENT_URL, {
    method: 'PATCH',
    body: JSON.stringify({ eventId, pinnedEventId, timelineId }),
  });
  return response;
};

export const deletePinnedEvents = async (id: string[], signal: AbortSignal) => {
  const response = await KibanaServices.get().http.delete<boolean>(PINNED_EVENTS_URL, {
    method: 'DELETE',
    body: JSON.stringify(id),
    signal,
  });
  return response;
};

export const deletAllPinnedEventsOnTimeline = async (timelineId: string, signal: AbortSignal) => {
  const response = await KibanaServices.get().http.delete<boolean>(PINNED_EVENTS_URL, {
    method: 'DELETE',
    query: { timelineId },
    signal,
  });
  return response;
};
