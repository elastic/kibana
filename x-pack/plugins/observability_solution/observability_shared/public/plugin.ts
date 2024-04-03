/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import type {
  BrowserUrlService,
  SharePluginSetup,
  SharePluginStart,
} from '@kbn/share-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { createLazyObservabilityPageTemplate } from './components/page_template';
import { createNavigationRegistry } from './components/page_template/helpers/navigation_registry';
import {
  type FlamegraphLocator,
  FlamegraphLocatorDefinition,
} from './locators/profiling/flamegraph_locator';
import {
  type StacktracesLocator,
  StacktracesLocatorDefinition,
} from './locators/profiling/stacktraces_locator';
import {
  type TopNFunctionsLocator,
  TopNFunctionsLocatorDefinition,
} from './locators/profiling/topn_functions_locator';
import { updateGlobalNavigation } from './services/update_global_navigation';
export interface ObservabilitySharedSetup {
  share: SharePluginSetup;
}

export interface ObservabilitySharedStart {
  spaces?: SpacesPluginStart;
  cases: CasesPublicStart;
  guidedOnboarding?: GuidedOnboardingPluginStart;
  embeddable: EmbeddableStart;
  share: SharePluginStart;
}

export type ObservabilitySharedPluginSetup = ReturnType<ObservabilitySharedPlugin['setup']>;
export type ObservabilitySharedPluginStart = ReturnType<ObservabilitySharedPlugin['start']>;
export type ProfilingLocators = ObservabilitySharedPluginSetup['locators']['profiling'];

interface ObservabilitySharedLocators {
  profiling: {
    flamegraphLocator: FlamegraphLocator;
    topNFunctionsLocator: TopNFunctionsLocator;
    stacktracesLocator: StacktracesLocator;
  };
}

export class ObservabilitySharedPlugin implements Plugin {
  private readonly navigationRegistry = createNavigationRegistry();
  private isSidebarEnabled$: BehaviorSubject<boolean>;

  constructor() {
    this.isSidebarEnabled$ = new BehaviorSubject<boolean>(true);
  }

  public setup(coreSetup: CoreSetup, pluginsSetup: ObservabilitySharedSetup) {
    coreSetup.getStartServices().then(([coreStart]) => {
      coreStart.chrome
        .getChromeStyle$()
        .subscribe((style) => this.isSidebarEnabled$.next(style === 'classic'));
    });

    return {
      locators: this.createLocators(pluginsSetup.share.url),
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
      guidedOnboardingApi: plugins.guidedOnboarding?.guidedOnboardingApi,
      getPageTemplateServices: () => ({ coreStart: core }),
      isSidebarEnabled$: this.isSidebarEnabled$,
    });

    return {
      locators: this.createLocators(plugins.share.url),
      navigation: {
        PageTemplate,
        registerSections: this.navigationRegistry.registerSections,
      },
      updateGlobalNavigation,
    };
  }

  public stop() {}

  private createLocators(urlService: BrowserUrlService): ObservabilitySharedLocators {
    return {
      profiling: {
        flamegraphLocator: urlService.locators.create(new FlamegraphLocatorDefinition()),
        topNFunctionsLocator: urlService.locators.create(new TopNFunctionsLocatorDefinition()),
        stacktracesLocator: urlService.locators.create(new StacktracesLocatorDefinition()),
      },
    };
  }
}
