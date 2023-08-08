/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SESSION_VIEW_APP_ID = 'sessionView';
export const USAGE_COLLECTION_APP_NAME = 'session_view'; // underscore delimited is required

// routes
export const CURRENT_API_VERSION = '1';
export const PROCESS_EVENTS_ROUTE = '/internal/session_view/process_events';
export const ALERTS_ROUTE = '/internal/session_view/alerts';
export const ALERT_STATUS_ROUTE = '/internal/session_view/alert_status';
export const IO_EVENTS_ROUTE = '/internal/session_view/io_events';
export const GET_TOTAL_IO_BYTES_ROUTE = '/internal/session_view/get_total_io_bytes';

export const SECURITY_APP_ID = 'security';
export const POLICIES_PAGE_PATH = '/administration/policy';

// index patterns
export const PREVIEW_ALERTS_INDEX = '.preview.alerts-security.alerts-default';

// field properties
export const ENTRY_SESSION_ENTITY_ID_PROPERTY = 'process.entry_leader.entity_id';
export const PROCESS_ENTITY_ID_PROPERTY = 'process.entity_id';
export const ALERT_UUID_PROPERTY = 'kibana.alert.uuid';
export const ALERT_ORIGINAL_TIME_PROPERTY = 'kibana.alert.original_time';
export const TOTAL_BYTES_CAPTURED_PROPERTY = 'process.io.total_bytes_captured';
export const TTY_CHAR_DEVICE_MAJOR_PROPERTY = 'process.tty.char_device.major';
export const TTY_CHAR_DEVICE_MINOR_PROPERTY = 'process.tty.char_device.minor';
export const HOST_ID_PROPERTY = 'host.id';
export const TIMESTAMP_PROPERTY = '@timestamp';

// page sizes
export const PROCESS_EVENTS_PER_PAGE = 500;
export const ALERTS_PER_PROCESS_EVENTS_PAGE = 1500;
export const ALERTS_PER_PAGE = 100;
export const IO_EVENTS_PER_PAGE = 10;

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
export const DEFAULT_TTY_PLAYSPEED_MS = 30; // milliseconds per render loop
export const TTY_LINES_PRE_SEEK = 200; // number of lines to redraw before the point we are seeking to.
export const DEFAULT_TTY_FONT_SIZE = 11;
export const DEFAULT_TTY_ROWS = 66;
export const DEFAULT_TTY_COLS = 280;

// we split terminal output on both newlines, carriage returns and cursor movements.
// this helps search navigate through results without having a single line rewrite itself before we highlight the match.
// it also creates a more interesting play by play
export const TTY_LINE_SPLITTER_REGEX = /(\r?\n|\r\n?|\x1b\[\d+;\d*[Hf]?)/gi;

// when showing the count of alerts in details panel tab, if the number
// exceeds ALERT_COUNT_THRESHOLD we put a + next to it, e.g  999+
export const ALERT_COUNT_THRESHOLD = 999;
export const ALERT_ICONS: { [key: string]: string } = {
  process: 'gear',
  file: 'document',
  network: 'globe',
};
export const DEFAULT_ALERT_FILTER_VALUE = 'all';
export const ALERT = 'alert';

// a list of fields to pull in ES queries for process_events_route, io_events_route and alerts.
export const PROCESS_EVENT_FIELDS = [
  '@timestamp',
  'event.id',
  'event.kind',
  'event.type',
  'event.action',
  'event.category',
  'user.id',
  'user.name',
  'group.id',
  'group.name',
  'host.architecture',
  'host.hostname',
  'host.id',
  'host.ip',
  'host.mac',
  'host.name',
  'host.os.family',
  'host.os.full',
  'host.os.kernel',
  'host.os.name',
  'host.platform',
  'host.version',
  'host.boot.id',
  'process.entity_id',
  'process.args',
  'process.command_line',
  'process.executable',
  'process.name',
  'process.interactive',
  'process.working_directory',
  'process.pid',
  'process.start',
  'process.end',
  'process.user.id',
  'process.user.name',
  'process.group.id',
  'process.group.name',
  'process.supplemental_groups',
  'process.exit_code',
  'process.tty.*',
  'process.entry_leader.*',
  'process.session_leader.*',
  'process.group_leader.*',
  'process.parent.*',
  'process.previous',
  'container.id',
  'container.name',
  'container.image.name',
  'container.image.tag',
  'container.image.hash.all',
  'orchestrator.resource.name',
  'orchestrator.resource.type',
  'orchestrator.resource.ip',
  'orchestrator.resource.parent.type',
  'orchestrator.resource.labels',
  'orchestrator.resource.annotations',
  'orchestrator.namespace',
  'orchestrator.cluster.name',
  'orchestrator.cluster.id',
  'cloud.instance.name',
  'cloud.account.id',
  'cloud.project.id',
  'cloud.project.name',
  'cloud.provider',
  'cloud.region',
];

export const IO_EVENT_FIELDS = PROCESS_EVENT_FIELDS.concat(['process.io.*']);

export const ALERT_FIELDS = PROCESS_EVENT_FIELDS.concat([
  'file.extension',
  'file.path',
  'file.name',
  'network.type',
  'network.transport',
  'network.protocol',
  'destination.address',
  'destination.ip',
  'destination.protocol',
  'source.address',
  'source.ip',
  'source.protocol',
  'kibana.alert.uuid',
  'kibana.alert.reason',
  'kibana.alert.workflow_status',
  'kibana.alert.status',
  'kibana.alert.original_time',
  'kibana.alert.original_event.action',
  'kibana.alert.rule.category',
  'kibana.alert.rule.consumer',
  'kibana.alert.rule.description',
  'kibana.alert.rule.enabled',
  'kibana.alert.rule.name',
  'kibana.alert.rule.risk_score',
  'kibana.alert.rule.severity',
  'kibana.alert.rule.uuid',
  'kibana.alert.rule.parameters.query',
  'kibana.alert.rule.query',
]);
