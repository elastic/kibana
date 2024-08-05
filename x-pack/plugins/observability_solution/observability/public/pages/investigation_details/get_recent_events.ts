/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';

export interface DetectEventsParams {
  eventsInterval: string;
}

export interface RecentEventsResponse {
  recentEvents: any;
}

export async function getRecentEvents(
  http: HttpSetup,
  { eventsInterval }: DetectEventsParams
): Promise<RecentEventsResponse> {
  const recentEvents = await http.get<RecentEventsResponse>(`/api/observability/detect_events`, {
    query: {
      eventsInterval,
    },
  });

  return {
    recentEvents,
  };
}
