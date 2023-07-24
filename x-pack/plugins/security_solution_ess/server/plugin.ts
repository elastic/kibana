/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup } from '@kbn/core/server';
import { DEFAULT_APP_FEATURES } from './constants';

import type {
  SecuritySolutionEssPluginSetup,
  SecuritySolutionEssPluginStart,
  SecuritySolutionEssPluginSetupDeps,
  SecuritySolutionEssPluginStartDeps,
} from './types';

export class SecuritySolutionEssPlugin
  implements
    Plugin<
      SecuritySolutionEssPluginSetup,
      SecuritySolutionEssPluginStart,
      SecuritySolutionEssPluginSetupDeps,
      SecuritySolutionEssPluginStartDeps
    >
{
  public setup(_coreSetup: CoreSetup, pluginsSetup: SecuritySolutionEssPluginSetupDeps) {
    pluginsSetup.securitySolution.setAppFeatures(DEFAULT_APP_FEATURES);
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
