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

// Containers
export { LogViewProvider, useLogViewContext } from './hooks/use_log_view';

// Shared components
export { LazyLogStreamWrapper as LogStream } from './components/log_stream/lazy_log_stream_wrapper';
export type { LogStreamProps } from './components/log_stream';
