/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { InvestigateConfig } from './config';

import { InvestigatePlugin } from './plugin';
import type {
  InvestigateServerSetup,
  InvestigateServerStart,
  InvestigateSetupDependencies,
  InvestigateStartDependencies,
} from './types';

export type { InvestigateServerSetup, InvestigateServerStart };

export const plugin: PluginInitializer<
  InvestigateServerSetup,
  InvestigateServerStart,
  InvestigateSetupDependencies,
  InvestigateStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<InvestigateConfig>) =>
  new InvestigatePlugin(pluginInitializerContext);
