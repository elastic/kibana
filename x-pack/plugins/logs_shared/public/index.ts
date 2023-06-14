/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsSharedPlugin } from './plugin';

export type {
  LogsSharedClientSetupExports,
  LogsSharedClientStartExports,
  LogsSharedClientSetupDeps,
  LogsSharedClientStartDeps,
} from './types';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new LogsSharedPlugin();
}

// Containers & Hook
export { LogViewProvider, useLogViewContext } from './hooks/use_log_view';
export { LogStreamProvider, useLogStreamContext } from './containers/logs/log_stream';
export {
  LogPositionStateProvider,
  useLogPositionStateContext,
} from './containers/logs/log_position';
export {
  LogHighlightsStateProvider,
  useLogHighlightsStateContext,
} from './containers/logs/log_highlights';
export type { LogSummaryBuckets, WithSummaryProps } from './containers/logs/log_summary';
export { useLogSummary, WithSummary } from './containers/logs/log_summary';
export { useLogEntryFlyout } from './components/logging/log_entry_flyout';

// Shared components
export type {
  LogEntryStreamItem,
  LogEntryColumnWidths,
} from './components/logging/log_text_stream';
export {
  iconColumnId,
  LogColumnHeader,
  LogColumnHeadersWrapper,
  LogEntryColumn,
  LogEntryContextMenu,
  LogEntryFieldColumn,
  LogEntryMessageColumn,
  LogEntryRowWrapper,
  LogEntryTimestampColumn,
  ScrollableLogTextStreamView,
  useColumnWidths,
} from './components/logging/log_text_stream';
export { LogEntryFlyout } from './components/logging/log_entry_flyout';
export { LazyLogStreamWrapper as LogStream } from './components/log_stream/lazy_log_stream_wrapper';
export type { LogStreamProps } from './components/log_stream';

// State machine utils
export {
  getLogViewReferenceFromUrl,
  initializeFromUrl,
  listenForUrlChanges,
  updateContextInUrl,
} from './observability_logs/log_view_state';
export type {
  LogViewContextWithError,
  LogViewContextWithResolvedLogView,
  LogViewNotificationChannel,
  LogViewNotificationEvent,
} from './observability_logs/log_view_state';
