/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { appIds } from '@kbn/management-cards-navigation';
import { getObservabilitySideNavComponent } from './components/side_navigation';
import { createObservabilityDashboardRegistration } from './logs_signal/overview_registration';
import {
  ServerlessObservabilityPublicSetup,
  ServerlessObservabilityPublicStart,
  ServerlessObservabilityPublicSetupDependencies,
  ServerlessObservabilityPublicStartDependencies,
} from './types';

export class ServerlessObservabilityPlugin
  implements
    Plugin<
      ServerlessObservabilityPublicSetup,
      ServerlessObservabilityPublicStart,
      ServerlessObservabilityPublicSetupDependencies,
      ServerlessObservabilityPublicStartDependencies
    >
{
  public setup(
    _core: CoreSetup<
      ServerlessObservabilityPublicStartDependencies,
      ServerlessObservabilityPublicStart
    >,
    setupDeps: ServerlessObservabilityPublicSetupDependencies
  ): ServerlessObservabilityPublicSetup {
    setupDeps.observability.dashboard.register(
      createObservabilityDashboardRegistration({
        search: _core
          .getStartServices()
          .then(([_coreStart, startDeps]) => startDeps.data.search.search),
      })
    );

    return {};
  }

  public start(
    core: CoreStart,
    setupDeps: ServerlessObservabilityPublicStartDependencies
  ): ServerlessObservabilityPublicStart {
    const { observabilityShared, serverless, management, cloud } = setupDeps;
    observabilityShared.setIsSidebarEnabled(false);
    serverless.setProjectHome('/app/observability/landing');
    serverless.setSideNavComponent(getObservabilitySideNavComponent(core, { serverless, cloud }));
    management.setIsSidebarEnabled(false);
    management.setupCardsNavigation({
      enabled: true,
      hideLinksTo: [appIds.RULES],
    });
    return {};
  }

  public stop() {}
}
