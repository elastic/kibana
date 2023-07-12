/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

import type { CasesUiStart } from '@kbn/cases-plugin/public';
import type { CoreStart, CoreSetup, Plugin } from '@kbn/core/public';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { createNavigationRegistry } from './components/page_template/helpers/navigation_registry';
import { createLazyObservabilityPageTemplate } from './components/page_template';
import { updateGlobalNavigation } from './services/update_global_navigation';
import { AlertsLocatorDefinition } from './locators/observability/alerts';
import { RulesLocatorDefinition } from './locators/observability/rules';
import { RuleDetailsLocatorDefinition } from './locators/observability/rule_details';
import { SloDetailsLocatorDefinition } from './locators/observability/slo_details';
import { SloEditLocatorDefinition } from './locators/observability/slo_edit';

export interface ObservabilitySharedSetup {
  share: SharePluginSetup;
}

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

  public setup(_: CoreSetup, plugins: ObservabilitySharedSetup) {
    const observabilityAlertsLocator = plugins.share.url.locators.create(
      new AlertsLocatorDefinition()
    );
    const observabilityRulesLocator = plugins.share.url.locators.create(
      new RulesLocatorDefinition()
    );

    const observabilityRuleDetailsLocator = plugins.share.url.locators.create(
      new RuleDetailsLocatorDefinition()
    );

    const observabilitySloDetailsLocator = plugins.share.url.locators.create(
      new SloDetailsLocatorDefinition()
    );

    const observabilitySloEditLocator = plugins.share.url.locators.create(
      new SloEditLocatorDefinition()
    );

    return {
      observabilityAlertsLocator,
      observabilityRulesLocator,
      observabilityRuleDetailsLocator,
      observabilitySloDetailsLocator,
      observabilitySloEditLocator,
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
