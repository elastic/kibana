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
import { ObservabilityAlertsLocator } from '../common/locators/observability/alerts';
import { ObservabilityRulesLocator } from '../common/locators/observability/rules';
import { ObservabilityRuleDetailsLocator } from '../common/locators/observability/rule_details';
import { ObservabilitySloDetailsLocator } from '../common/locators/observability/slo_details';
import { ObservabilitySloEditLocator } from '../common/locators/observability/slo_edit';
import { syntheticsEditMonitorLocator } from '../common/locators/synthetics/edit_monitor';
import { syntheticsMonitorDetailLocator } from '../common/locators/synthetics/monitor_detail';
import { syntheticsSettingsLocator } from '../common/locators/synthetics/settings';
import { uptimeOverviewLocator } from '../common/locators/synthetics/overview';

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
    plugins.share.url.locators.create(new ObservabilityAlertsLocator());
    plugins.share.url.locators.create(new ObservabilityRulesLocator());
    plugins.share.url.locators.create(new ObservabilityRuleDetailsLocator());
    plugins.share.url.locators.create(new ObservabilitySloDetailsLocator());
    plugins.share.url.locators.create(new ObservabilitySloEditLocator());

    plugins.share.url.locators.create(syntheticsEditMonitorLocator);
    plugins.share.url.locators.create(syntheticsMonitorDetailLocator);
    plugins.share.url.locators.create(syntheticsSettingsLocator);
    plugins.share.url.locators.create(uptimeOverviewLocator);

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
