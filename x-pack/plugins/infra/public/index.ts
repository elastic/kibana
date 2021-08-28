/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer } from '../../../../src/core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../../src/core/public/plugins/plugin_context';
import { Plugin } from './plugin';
import type {
  InfraClientSetupDeps,
  InfraClientSetupExports,
  InfraClientStartDeps,
  InfraClientStartExports,
} from './types';

export const plugin: PluginInitializer<
  InfraClientSetupExports,
  InfraClientStartExports,
  InfraClientSetupDeps,
  InfraClientStartDeps
> = (context: PluginInitializerContext) => {
  return new Plugin(context);
};

export { FORMATTERS } from '../common/formatters';
export type { LogStreamProps } from './components/log_stream';
// Shared components
export { LazyLogStreamWrapper as LogStream } from './components/log_stream/lazy_log_stream_wrapper';
export { InfraFormatterType } from './lib/lib';

export type InfraAppId = 'logs' | 'metrics';
