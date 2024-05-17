/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import { BehaviorSubject } from 'rxjs';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { OnboardingPageService } from './app/components/onboarding/onboarding_page_service';
import { breadcrumbsNav$ } from './common/breadcrumbs';
import { navLinks$, updateNavLinks } from './common/links/nav_links';
import { ContractComponentsService } from './contract_components';
import type { ContractStartServices, PluginSetup, PluginStart } from './types';

export class PluginContract {
  public componentsService: ContractComponentsService;
  public upsellingService: UpsellingService;
  public onboardingPageService: OnboardingPageService;
  public isSolutionNavigationEnabled$: BehaviorSubject<boolean>;

  constructor(private readonly experimentalFeatures: ExperimentalFeatures) {
    this.onboardingPageService = new OnboardingPageService();
    this.componentsService = new ContractComponentsService();
    this.upsellingService = new UpsellingService();
    this.isSolutionNavigationEnabled$ = new BehaviorSubject<boolean>(false); // defaults to classic navigation
  }

  public getSetupContract(): PluginSetup {
    return {
      resolver: lazyResolver,
      experimentalFeatures: { ...this.experimentalFeatures },
    };
  }

  public getStartContract(core: CoreStart): PluginStart {
    return {
      setOnboardingPageSettings: this.onboardingPageService,
      getNavLinks$: () => navLinks$,
      setComponents: (components) => {
        this.componentsService.setComponents(components);
      },
      getBreadcrumbsNav$: () => breadcrumbsNav$,
      getUpselling: () => this.upsellingService,
      // TODO: remove the following APIs after rollout https://github.com/elastic/kibana/issues/179572
      setIsSolutionNavigationEnabled: (isSolutionNavigationEnabled) => {
        this.isSolutionNavigationEnabled$.next(isSolutionNavigationEnabled);
        updateNavLinks(isSolutionNavigationEnabled, core);
      },
      getSolutionNavigation: () => lazySolutionNavigation(core),
    };
  }

  public getStartServices(): ContractStartServices {
    return {
      getComponents$: this.componentsService.getComponents$.bind(this.componentsService),
      upselling: this.upsellingService,
      onboarding: this.onboardingPageService,
    };
  }
}

/**
 * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
 * See https://webpack.js.org/api/module-methods/#magic-comments
 */
const lazyResolver = async () => {
  const { resolverPluginSetup } = await import(
    /* webpackChunkName: "resolver" */
    './resolver'
  );
  return resolverPluginSetup();
};
const lazySolutionNavigation = async (core: CoreStart) => {
  const { getSolutionNavigation } = await import(
    /* webpackChunkName: "solution_navigation" */
    './app/solution_navigation'
  );
  return getSolutionNavigation(core);
};
