/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { subscribeBreadcrumbs } from './breadcrumbs';
import { createServices } from './common/services';
import { getSecurityGetStartedComponent } from './get_started';
import { registerUpsellings } from './upselling/register_upsellings';
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
    const { securitySolution, licensing } = startDeps;
    const services = createServices(core, startDeps);

    licensing.license$.subscribe((license) => {
      registerUpsellings(securitySolution.getUpselling(), license, services);
    });

    securitySolution.setGetStartedPage(getSecurityGetStartedComponent(services));
    subscribeBreadcrumbs(services);

    return {};
  }

  public stop() {}
}
