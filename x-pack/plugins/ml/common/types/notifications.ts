/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MessageLevel } from '../constants/message_levels';

export interface NotificationsQueryParams {
  level?: MessageLevel;
  type?: string;
  size?: number;
  from?: number;
  sortField?: string;
  sortDirection?: string;
  queryString?: string;
  earliest?: string;
  latest?: string;
}

export interface NotificationSource {
  message: string;
  job_id: string;
  level: MessageLevel;
  timestamp: number;
  node_name: string;
  job_type: string;
}

export interface NotificationsSearchResponse {
  total: number;
  results: Array<
    NotificationSource & {
      id: string;
    }
  >;
}

export type NotificationItem = NotificationsSearchResponse['results'][number];

export interface NotificationsCountQueryParams {
  lastCheckedAt: number;
}

export type NotificationsCountResponse = {
  [key in MessageLevel]: number;
};
