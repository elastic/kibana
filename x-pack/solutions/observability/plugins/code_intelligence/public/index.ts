/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core/public';
import {
  CodeIntelligencePublicPlugin,
  type CodeIntelligencePublicSetup,
  type CodeIntelligencePublicStart,
} from './plugin';

export type { CodeIntelligencePublicSetup, CodeIntelligencePublicStart };

export const plugin: PluginInitializer<
  CodeIntelligencePublicSetup,
  CodeIntelligencePublicStart
> = () => new CodeIntelligencePublicPlugin();
