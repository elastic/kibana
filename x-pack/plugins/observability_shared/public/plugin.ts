/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

import type { CoreStart, Plugin } from '@kbn/core/public';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import { CasesUiStart } from '@kbn/cases-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { createNavigationRegistry } from './components/page_template/helpers/navigation_registry';
import { createLazyObservabilityPageTemplate } from './components/page_template';
import { updateGlobalNavigation } from './services/update_global_navigation';

export interface ObservabilitySharedStart {
  spaces?: SpacesPluginStart;
  cases: CasesUiStart;
  guidedOnboarding: GuidedOnboardingPluginStart;
  setIsSidebarEnabled: (isEnabled: boolean) => void;
}

export type ObservabilitySharedPluginSetup = ReturnType<ObservabilitySharedPlugin['setup']>;
export type ObservabilitySharedPluginStart = ReturnType<ObservabilitySharedPlugin['start']>;

export class ObservabilitySharedPlugin implements Plugin {
  private readonly navigationRegistry = createNavigationRegistry();
  private isSidebarEnabled$: BehaviorSubject<boolean>;

  constructor() {
    this.isSidebarEnabled$ = new BehaviorSubject<boolean>(true);
  }

  public setup() {
    return {
      navigation: {
        registerSections: this.navigationRegistry.registerSections,
      },
    };
  }

  public start(core: CoreStart, plugins: ObservabilitySharedStart) {
    const { application } = core;

    const PageTemplate = createLazyObservabilityPageTemplate({
      currentAppId$: application.currentAppId$,
      getUrlForApp: application.getUrlForApp,
      navigateToApp: application.navigateToApp,
      navigationSections$: this.navigationRegistry.sections$,
      guidedOnboardingApi: plugins.guidedOnboarding.guidedOnboardingApi,
      getPageTemplateServices: () => ({ coreStart: core }),
      isSidebarEnabled$: this.isSidebarEnabled$,
    });

    return {
      navigation: {
        PageTemplate,
        registerSections: this.navigationRegistry.registerSections,
      },
      updateGlobalNavigation,
      setIsSidebarEnabled: (isEnabled: boolean) => this.isSidebarEnabled$.next(isEnabled),
    };
  }

  public stop() {}
}
