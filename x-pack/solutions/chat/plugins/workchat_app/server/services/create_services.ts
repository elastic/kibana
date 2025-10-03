/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { LoggerFactory } from '@kbn/core/server';
import type { WorkChatAppPluginStartDependencies } from '../types';
import type { WorkChatAppConfig } from '../config';
import type { InternalServices } from './types';

interface CreateServicesParams {
  core: CoreStart;
  config: WorkChatAppConfig;
  loggerFactory: LoggerFactory;
  pluginsDependencies: WorkChatAppPluginStartDependencies;
}

export function createServices({
  core,
  config,
  loggerFactory,
  pluginsDependencies,
}: CreateServicesParams): InternalServices {
  return {};
}
