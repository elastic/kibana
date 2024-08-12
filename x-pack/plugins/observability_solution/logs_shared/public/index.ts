/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dynamic } from '@kbn/shared-ux-utility';
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
export { LogViewProvider, useLogViewContext, useLogView } from './hooks/use_log_view';
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

// Shared components
export type { LogAIAssistantDocument } from './components/log_ai_assistant/log_ai_assistant';
export type {
  LogEntryStreamItem,
  LogEntryColumnWidths,
} from './components/logging/log_text_stream';
export {
  iconColumnId,
  useColumnWidths,
} from './components/logging/log_text_stream/log_entry_column';
export type { LogAIAssistantProps } from './components/log_ai_assistant/log_ai_assistant';
export type { LogStreamProps } from './components/log_stream/log_stream';

export const WithSummary = dynamic(() => import('./containers/logs/log_summary/with_summary'));
export const LogEntryFlyout = dynamic(
  () => import('./components/logging/log_entry_flyout/log_entry_flyout')
);
export const LogAIAssistant = dynamic(
  () => import('./components/log_ai_assistant/log_ai_assistant')
);
export const LogStream = dynamic(() => import('./components/log_stream/log_stream'));
export const LogColumnHeader = dynamic(
  () => import('./components/logging/log_text_stream/column_headers')
);
export const LogColumnHeadersWrapper = dynamic(
  () => import('./components/logging/log_text_stream/column_headers_wrapper')
);
export const LogEntryColumn = dynamic(
  () => import('./components/logging/log_text_stream/log_entry_column')
);
export const LogEntryContextMenu = dynamic(
  () => import('./components/logging/log_text_stream/log_entry_context_menu')
);
export const LogEntryFieldColumn = dynamic(
  () => import('./components/logging/log_text_stream/log_entry_field_column')
);
export const LogEntryMessageColumn = dynamic(
  () => import('./components/logging/log_text_stream/log_entry_message_column')
);
export const LogEntryRowWrapper = dynamic(
  () => import('./components/logging/log_text_stream/log_entry_row_wrapper')
);
export const LogEntryTimestampColumn = dynamic(
  () => import('./components/logging/log_text_stream/log_entry_timestamp_column')
);
export const ScrollableLogTextStreamView = dynamic(
  () => import('./components/logging/log_text_stream/scrollable_log_text_stream_view')
);

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
