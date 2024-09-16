/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { InferenceConfig } from './config';
import { InferencePlugin } from './plugin';
import type {
  InferenceServerSetup,
  InferenceServerStart,
  InferenceSetupDependencies,
  InferenceStartDependencies,
} from './types';

export { withoutTokenCountEvents } from '../common/chat_complete/without_token_count_events';
export { withoutChunkEvents } from '../common/chat_complete/without_chunk_events';
export { withoutOutputUpdateEvents } from '../common/output/without_output_update_events';

export type { InferenceClient } from './types';
export { naturalLanguageToEsql } from './tasks/nl_to_esql';

export type { InferenceServerSetup, InferenceServerStart };

export const plugin: PluginInitializer<
  InferenceServerSetup,
  InferenceServerStart,
  InferenceSetupDependencies,
  InferenceStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<InferenceConfig>) =>
  new InferencePlugin(pluginInitializerContext);
