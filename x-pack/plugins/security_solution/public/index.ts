/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';

import { Plugin } from './plugin';
import type { PluginSetup, PluginStart } from './types';
export type { TimelineModel } from './timelines/store/timeline/model';
export type { LinkItem } from './common/links';

export type {
  UpsellingService,
  PageUpsellings,
  SectionUpsellings,
  UpsellingSectionId,
} from './common/lib/upsellings';

export const plugin = (context: PluginInitializerContext): Plugin => new Plugin(context);

export type { PluginSetup, PluginStart };
export { Plugin };
