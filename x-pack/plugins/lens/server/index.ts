/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core-plugins-server';
import { LensServerPlugin } from './plugin';
export type { LensServerPluginSetup } from './plugin';

export const plugin = (initContext: PluginInitializerContext) => new LensServerPlugin(initContext);

export type { LensDocShape715 } from './migrations/types';
