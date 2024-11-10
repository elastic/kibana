/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin as PluginClass } from '@kbn/core/public';
import type { StreamsRepositoryClient } from './api';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StreamsPluginSetup {}

export interface StreamsPluginStart {
  streamsRepositoryClient: StreamsRepositoryClient;
}

export type StreamsPluginClass = PluginClass<StreamsPluginSetup, StreamsPluginStart, {}, {}>;
