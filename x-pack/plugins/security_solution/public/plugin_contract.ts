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
import { navLinks$ } from './common/links/nav_links';
import { breadcrumbsNav$ } from './common/breadcrumbs';

export class PluginContract {
  public isILMAvailable$: BehaviorSubject<boolean>;
  public isSidebarEnabled$: BehaviorSubject<boolean>;
  public getStartedComponent$: BehaviorSubject<React.ComponentType | null>;
  public dashboardsLandingCallout$: BehaviorSubject<React.ComponentType | null>;
  public upsellingService: UpsellingService;
  public extraRoutes$: BehaviorSubject<RouteProps[]>;
  public appLinksSwitcher: AppLinksSwitcher;

  constructor() {
    this.extraRoutes$ = new BehaviorSubject<RouteProps[]>([]);
    this.isILMAvailable$ = new BehaviorSubject<boolean>(true);
    this.isSidebarEnabled$ = new BehaviorSubject<boolean>(true);
    this.getStartedComponent$ = new BehaviorSubject<React.ComponentType | null>(null);
    this.dashboardsLandingCallout$ = new BehaviorSubject<React.ComponentType | null>(null);

    this.upsellingService = new UpsellingService();
    this.appLinksSwitcher = (appLinks) => appLinks;
  }

  public getStartServices(): ContractStartServices {
    return {
      extraRoutes$: this.extraRoutes$.asObservable(),
      isILMAvailable$: this.isILMAvailable$.asObservable(),
      isSidebarEnabled$: this.isSidebarEnabled$.asObservable(),
      getStartedComponent$: this.getStartedComponent$.asObservable(),
      dashboardsLandingCalloutComponent$: this.dashboardsLandingCallout$.asObservable(),
      upselling: this.upsellingService,
    };
  }

  public getSetupContract(): PluginSetup {
    return {
      resolver: lazyResolver,
      setAppLinksSwitcher: (appLinksSwitcher) => {
        this.appLinksSwitcher = appLinksSwitcher;
      },
    };
  }

  public getStartContract(): PluginStart {
    return {
      getNavLinks$: () => navLinks$,
      setExtraRoutes: (extraRoutes) => this.extraRoutes$.next(extraRoutes),
      setIsSidebarEnabled: (isSidebarEnabled: boolean) =>
        this.isSidebarEnabled$.next(isSidebarEnabled),
      setIsILMAvailable: (isILMAvailable: boolean) => this.isILMAvailable$.next(isILMAvailable),
      setGetStartedPage: (getStartedComponent) => {
        this.getStartedComponent$.next(getStartedComponent);
      },
      setDashboardsLandingCallout: (dashboardsLandingCallout) => {
        this.dashboardsLandingCallout$.next(dashboardsLandingCallout);
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
