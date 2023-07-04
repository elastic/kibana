/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { subscribeBreadcrumbs } from './breadcrumbs';
import { getSecurityGetStartedComponent } from './get_started';
import {
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
  constructor() {}

  public setup(
    _core: CoreSetup,
    _setupDeps: SecuritySolutionEssPluginSetupDeps
  ): SecuritySolutionEssPluginSetup {
    return {};
  }

  public start(
    core: CoreStart,
    startDeps: SecuritySolutionEssPluginStartDeps
  ): SecuritySolutionEssPluginStart {
    const { securitySolution } = startDeps;

    subscribeBreadcrumbs(securitySolution, core);
    securitySolution.setGetStartedPage(getSecurityGetStartedComponent(core, startDeps));

    return {};
  }

  public stop() {}
}
