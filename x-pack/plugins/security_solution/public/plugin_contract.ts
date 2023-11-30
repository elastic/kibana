/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { RouteProps } from 'react-router-dom';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import type { ContractStartServices, PluginSetup, PluginStart } from './types';
import type { DataQualityPanelConfig } from './overview/types';
import type { AppLinksSwitcher } from './common/links';
import type { DeepLinksFormatter } from './common/links/deep_links';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { navLinks$ } from './common/links/nav_links';
import { breadcrumbsNav$ } from './common/breadcrumbs';
import { ContractComponentsService } from './contract_components';

export class PluginContract {
  public isSidebarEnabled$: BehaviorSubject<boolean>;
  public componentsService: ContractComponentsService;
  public upsellingService: UpsellingService;
  public extraRoutes$: BehaviorSubject<RouteProps[]>;
  public appLinksSwitcher: AppLinksSwitcher;
  public deepLinksFormatter?: DeepLinksFormatter;
  public dataQualityPanelConfig?: DataQualityPanelConfig;

  constructor(private readonly experimentalFeatures: ExperimentalFeatures) {
    this.extraRoutes$ = new BehaviorSubject<RouteProps[]>([]);
    this.isSidebarEnabled$ = new BehaviorSubject<boolean>(true);
    this.componentsService = new ContractComponentsService();
    this.upsellingService = new UpsellingService();
    this.appLinksSwitcher = (appLinks) => appLinks;
  }

  public getStartServices(): ContractStartServices {
    return {
      extraRoutes$: this.extraRoutes$.asObservable(),
      isSidebarEnabled$: this.isSidebarEnabled$.asObservable(),
      getComponents$: this.componentsService.getComponents$.bind(this.componentsService),
      upselling: this.upsellingService,
      dataQualityPanelConfig: this.dataQualityPanelConfig,
    };
  }

  public getSetupContract(): PluginSetup {
    return {
      resolver: lazyResolver,
      experimentalFeatures: { ...this.experimentalFeatures },
      setAppLinksSwitcher: (appLinksSwitcher) => {
        this.appLinksSwitcher = appLinksSwitcher;
      },
      setDeepLinksFormatter: (deepLinksFormatter) => {
        this.deepLinksFormatter = deepLinksFormatter;
      },
      setDataQualityPanelConfig: (dataQualityPanelConfig) => {
        this.dataQualityPanelConfig = dataQualityPanelConfig;
      },
    };
  }

  public getStartContract(): PluginStart {
    return {
      getNavLinks$: () => navLinks$,
      setExtraRoutes: (extraRoutes) => this.extraRoutes$.next(extraRoutes),
      setIsSidebarEnabled: (isSidebarEnabled: boolean) =>
        this.isSidebarEnabled$.next(isSidebarEnabled),
      setComponents: (components) => {
        this.componentsService.setComponents(components);
      },
      getBreadcrumbsNav$: () => breadcrumbsNav$,
      getUpselling: () => this.upsellingService,
    };
  }

  public getStopContract() {
    return {};
  }
}

const lazyResolver = async () => {
  /**
   * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
   * See https://webpack.js.org/api/module-methods/#magic-comments
   */
  const { resolverPluginSetup } = await import(
    /* webpackChunkName: "resolver" */
    './resolver'
  );
  return resolverPluginSetup();
};
