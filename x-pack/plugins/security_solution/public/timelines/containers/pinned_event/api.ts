/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PINNED_EVENT_URL } from '../../../../common/constants';
import type { PinnedEvent } from '../../../../common/types/timeline/pinned_event';
import { KibanaServices } from '../../../common/lib/kibana';

export const persistPinnedEvent = async ({
  eventId,
  pinnedEventId,
  timelineId,
}: {
  eventId: string;
  pinnedEventId?: string | null;
  timelineId?: string | null;
}) => {
  let requestBody;
  try {
    requestBody = JSON.stringify({ eventId, pinnedEventId, timelineId });
  } catch (err) {
    return Promise.reject(new Error(`Failed to stringify query: ${JSON.stringify(err)}`));
  }
  const response = await KibanaServices.get().http.patch<PinnedEvent | null>(PINNED_EVENT_URL, {
    method: 'PATCH',
    body: requestBody,
  });
  return response;
};
