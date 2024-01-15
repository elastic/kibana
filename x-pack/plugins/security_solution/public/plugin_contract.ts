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
import type { AppLinksSwitcher } from './common/links';
import type { DeepLinksFormatter } from './common/links/deep_links';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { navLinks$ } from './common/links/nav_links';
import { breadcrumbsNav$ } from './common/breadcrumbs';
import { ContractComponentsService } from './contract_components';
import type { SecurityProductTypes } from './common/components/landing_page/get_started/configs';
import type { StepId } from './common/components/landing_page/get_started/types';

export class PluginContract {
  public componentsService: ContractComponentsService;
  public upsellingService: UpsellingService;
  public extraRoutes$: BehaviorSubject<RouteProps[]>;
  public appLinksSwitcher: AppLinksSwitcher;
  public deepLinksFormatter?: DeepLinksFormatter;
  public productTypes$: BehaviorSubject<SecurityProductTypes | undefined>;
  public projectsUrl$: BehaviorSubject<string | undefined>;
  public projectFeaturesUrl$: BehaviorSubject<string | undefined>;
  public availableSteps$: BehaviorSubject<StepId[]>;

  constructor(private readonly experimentalFeatures: ExperimentalFeatures) {
    this.extraRoutes$ = new BehaviorSubject<RouteProps[]>([]);
    this.productTypes$ = new BehaviorSubject<SecurityProductTypes | undefined>(undefined);
    this.projectsUrl$ = new BehaviorSubject<string | undefined>(undefined);
    this.projectFeaturesUrl$ = new BehaviorSubject<string | undefined>(undefined);
    this.availableSteps$ = new BehaviorSubject<StepId[]>([]);

    this.componentsService = new ContractComponentsService();
    this.upsellingService = new UpsellingService();
    this.appLinksSwitcher = (appLinks) => appLinks;
  }

  public getStartServices(): ContractStartServices {
    return {
      extraRoutes$: this.extraRoutes$.asObservable(),
      productTypes$: this.productTypes$.asObservable(),
      projectsUrl$: this.projectsUrl$.asObservable(),
      projectFeaturesUrl$: this.projectFeaturesUrl$.asObservable(),
      availableSteps$: this.availableSteps$.asObservable(),
      getComponents$: this.componentsService.getComponents$.bind(this.componentsService),
      upselling: this.upsellingService,
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
    };
  }

  public getStartContract(): PluginStart {
    return {
      setProductTypes: (productTypes) => {
        this.productTypes$.next(productTypes);
      },
      setProjectFeaturesUrl: (projectFeaturesUrl) => {
        this.projectFeaturesUrl$.next(projectFeaturesUrl);
      },
      setProjectsUrl: (projectsUrl) => {
        this.projectsUrl$.next(projectsUrl);
      },
      setAvailableSteps: (availableSteps) => {
        this.availableSteps$.next(availableSteps);
      },
      getNavLinks$: () => navLinks$,
      setExtraRoutes: (extraRoutes) => this.extraRoutes$.next(extraRoutes),
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
