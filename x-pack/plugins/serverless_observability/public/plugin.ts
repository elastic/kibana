/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { appCategories, appIds } from '@kbn/management-cards-navigation';
import { map, of } from 'rxjs';
import { createNavigationTree } from './navigation_tree';
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
    const { serverless, management, security } = setupDeps;
    const navigationTree$ = (setupDeps.streams?.status$ || of({ status: 'disabled' })).pipe(
      map(({ status }) => {
        return createNavigationTree({ streamsAvailable: status === 'enabled' });
      })
    );
    serverless.setProjectHome('/app/observability/landing');
    serverless.initNavigation('oblt', navigationTree$, { dataTestSubj: 'svlObservabilitySideNav' });
    const aiAssistantIsEnabled = core.application.capabilities.observabilityAIAssistant?.show;
    const extendCardNavDefinitions = aiAssistantIsEnabled
      ? serverless.getNavigationCards(security.authz.isRoleManagementEnabled(), {
          observabilityAiAssistantManagement: {
            category: appCategories.OTHER,
            title: i18n.translate('xpack.serverlessObservability.aiAssistantManagementTitle', {
              defaultMessage: 'AI Assistant Settings',
            }),
            description: i18n.translate(
              'xpack.serverlessObservability.aiAssistantManagementDescription',
              {
                defaultMessage:
                  'Manage knowledge base and control assistant behavior, including response language.',
              }
            ),
            icon: 'sparkles',
          },
        })
      : undefined;
    management.setupCardsNavigation({
      enabled: true,
      hideLinksTo: [appIds.RULES],
      extendCardNavDefinitions,
    });

    return {};
  }

  public stop() {}
}
