/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PROCESS_EVENTS_ROUTE = '/internal/session_view/process_events_route';
export const ALERTS_ROUTE = '/internal/session_view/alerts_route';
export const ALERT_STATUS_ROUTE = '/internal/session_view/alert_status_route';
export const SESSION_ENTRY_LEADERS_ROUTE = '/internal/session_view/session_entry_leaders_route';
export const PROCESS_EVENTS_INDEX = '*:logs-endpoint.events.process*,logs-endpoint.events.process*'; // match on both cross cluster and local indices
export const PREVIEW_ALERTS_INDEX = '.preview.alerts-security.alerts-default';
export const ENTRY_SESSION_ENTITY_ID_PROPERTY = 'process.entry_leader.entity_id';
export const ALERT_UUID_PROPERTY = 'kibana.alert.uuid';
export const ALERT_ORIGINAL_TIME_PROPERTY = 'kibana.alert.original_time';
export const ALERT_STATUS = {
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  CLOSED: 'closed',
};

export const PROCESS_EVENTS_PER_PAGE = 500;
export const ALERTS_PER_PROCESS_EVENTS_PAGE = 1500;
export const ALERTS_PER_PAGE = 100;
export const ALERTS_IN_FIRST_PAGE = 8;

// when showing the count of alerts in details panel tab, if the number
// exceeds ALERT_COUNT_THRESHOLD we put a + next to it, e.g  500+
export const ALERT_COUNT_THRESHOLD = 500;

// react-query caching keys
export const QUERY_KEY_PROCESS_EVENTS = 'sessionViewProcessEvents';
export const QUERY_KEY_ALERTS = 'sessionViewAlerts';
export const LOCAL_STORAGE_DISPLAY_OPTIONS_KEY = 'sessionView:displayOptions';

export const MOUSE_EVENT_PLACEHOLDER = { stopPropagation: () => undefined } as React.MouseEvent;

export const DEBOUNCE_TIMEOUT = 500;
