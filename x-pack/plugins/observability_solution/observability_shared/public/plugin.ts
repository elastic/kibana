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
  type AssetDetailsFlyoutLocator,
  AssetDetailsFlyoutLocatorDefinition,
} from './locators/infra/asset_details_flyout_locator';
import {
  type AssetDetailsLocator,
  AssetDetailsLocatorDefinition,
} from './locators/infra/asset_details_locator';
import { type HostsLocator, HostsLocatorDefinition } from './locators/infra/hosts_locator';
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
import {
  type ServiceOverviewLocator,
  ServiceOverviewLocatorDefinition,
} from './locators/apm/service_overview_locator';
import { updateGlobalNavigation } from './services/update_global_navigation';
import {
  type TransactionDetailsByNameLocator,
  TransactionDetailsByNameLocatorDefinition,
} from './locators/apm/transaction_details_by_name_locator';
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
  infra: {
    assetDetailsLocator: AssetDetailsLocator;
    assetDetailsFlyoutLocator: AssetDetailsFlyoutLocator;
    hostsLocator: HostsLocator;
  };
  profiling: {
    flamegraphLocator: FlamegraphLocator;
    topNFunctionsLocator: TopNFunctionsLocator;
    stacktracesLocator: StacktracesLocator;
  };
  apm: {
    serviceOverview: ServiceOverviewLocator;
    transactionDetailsByName: TransactionDetailsByNameLocator;
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
      infra: {
        assetDetailsLocator: urlService.locators.create(new AssetDetailsLocatorDefinition()),
        assetDetailsFlyoutLocator: urlService.locators.create(
          new AssetDetailsFlyoutLocatorDefinition()
        ),
        hostsLocator: urlService.locators.create(new HostsLocatorDefinition()),
      },
      profiling: {
        flamegraphLocator: urlService.locators.create(new FlamegraphLocatorDefinition()),
        topNFunctionsLocator: urlService.locators.create(new TopNFunctionsLocatorDefinition()),
        stacktracesLocator: urlService.locators.create(new StacktracesLocatorDefinition()),
      },
      apm: {
        serviceOverview: urlService.locators.create(new ServiceOverviewLocatorDefinition()),
        transactionDetailsByName: urlService.locators.create(
          new TransactionDetailsByNameLocatorDefinition()
        ),
      },
    };
  }
}
