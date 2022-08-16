/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// routes
export const PROCESS_EVENTS_ROUTE = '/internal/session_view/process_events';
export const ALERTS_ROUTE = '/internal/session_view/alerts';
export const ALERT_STATUS_ROUTE = '/internal/session_view/alert_status';
export const IO_EVENTS_ROUTE = '/internal/session_view/io_events';
export const GET_TOTAL_IO_BYTES_ROUTE = '/internal/session_view/get_total_io_bytes';

// index patterns
export const PROCESS_EVENTS_INDEX = '*:logs-endpoint.events.process*,logs-endpoint.events.process*'; // match on both cross cluster and local indices
export const PREVIEW_ALERTS_INDEX = '.preview.alerts-security.alerts-default';

// field properties
export const ENTRY_SESSION_ENTITY_ID_PROPERTY = 'process.entry_leader.entity_id';
export const ALERT_UUID_PROPERTY = 'kibana.alert.uuid';
export const ALERT_ORIGINAL_TIME_PROPERTY = 'kibana.alert.original_time';
export const TOTAL_BYTES_CAPTURED_PROPERTY = 'process.io.total_bytes_captured';

// page sizes
export const PROCESS_EVENTS_PER_PAGE = 500;
export const ALERTS_PER_PROCESS_EVENTS_PAGE = 1500;
export const ALERTS_PER_PAGE = 100;
export const IO_EVENTS_PER_PAGE = 2;

// react-query caching keys
export const QUERY_KEY_PROCESS_EVENTS = 'sessionViewProcessEvents';
export const QUERY_KEY_ALERTS = 'sessionViewAlerts';
export const QUERY_KEY_IO_EVENTS = 'sessionViewIOEvents';
export const QUERY_KEY_GET_TOTAL_IO_BYTES = 'sessionViewGetTotalIOBytes';

// other
export const ALERT_STATUS = {
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  CLOSED: 'closed',
};
export const LOCAL_STORAGE_DISPLAY_OPTIONS_KEY = 'sessionView:displayOptions';
export const MOUSE_EVENT_PLACEHOLDER = { stopPropagation: () => undefined } as React.MouseEvent;
export const DEBOUNCE_TIMEOUT = 500;
export const DEFAULT_TTY_PLAYSPEED_MS = 40; // milli seconds per line of tty output.

// when showing the count of alerts in details panel tab, if the number
// exceeds ALERT_COUNT_THRESHOLD we put a + next to it, e.g  999+
export const ALERT_COUNT_THRESHOLD = 999;
