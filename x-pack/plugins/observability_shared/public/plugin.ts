/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin } from '@kbn/core/public';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import { createNavigationRegistry } from './components/page_template/helpers/navigation_registry';
import { createLazyObservabilityPageTemplate } from './components/page_template';
import { updateGlobalNavigation } from './services/update_global_navigation';

export interface ObservabilitySharedStart {
  guidedOnboarding: GuidedOnboardingPluginStart;
}

export type ObservabilitySharedPluginSetup = ReturnType<ObservabilitySharedPlugin['setup']>;
export type ObservabilitySharedPluginStart = ReturnType<ObservabilitySharedPlugin['start']>;

export class ObservabilitySharedPlugin implements Plugin {
  private readonly navigationRegistry = createNavigationRegistry();

  public setup() {
    return {
      navigation: {
        registerSections: this.navigationRegistry.registerSections,
      },
    };
  }

  public start(core: CoreStart, plugins: ObservabilitySharedStart) {
    const { application, chrome } = core;

    const PageTemplate = createLazyObservabilityPageTemplate({
      currentAppId$: application.currentAppId$,
      getUrlForApp: application.getUrlForApp,
      navigateToApp: application.navigateToApp,
      navigationSections$: this.navigationRegistry.sections$,
      guidedOnboardingApi: plugins.guidedOnboarding.guidedOnboardingApi,
      getPageTemplateServices: () => ({ coreStart: core }),
      getChromeStyle$: chrome.getChromeStyle$,
    });

    return {
      navigation: {
        PageTemplate,
      },
      updateGlobalNavigation,
    };
  }

  public stop() {}
}
