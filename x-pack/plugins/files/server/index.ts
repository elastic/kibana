/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import { FilesPlugin } from './plugin';

export type { FilesSetup, FilesStart } from './types';
export type { FileShareServiceStart } from './file_share_service';

export function plugin(initializerContext: PluginInitializerContext) {
  return new FilesPlugin(initializerContext);
}
