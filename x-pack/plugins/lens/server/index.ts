/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110891
/* eslint-disable @kbn/eslint/no_export_all */

import { PluginInitializerContext } from '@kbn/core/server';
import { LensServerPlugin } from './plugin';

export type { LensServerPluginSetup } from './plugin';
export * from './plugin';
export * from './migrations/types';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new LensServerPlugin(initializerContext);
