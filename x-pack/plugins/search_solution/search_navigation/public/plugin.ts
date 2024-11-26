/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  ScopedHistory,
} from '@kbn/core/public';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import type { Logger } from '@kbn/logging';
import type {
  SearchNavigationPluginSetup,
  SearchNavigationPluginStart,
  ClassicNavItem,
  ClassicNavigationFactoryFn,
} from './types';

export class SearchNavigationPlugin
  implements Plugin<SearchNavigationPluginSetup, SearchNavigationPluginStart>
{
  private readonly logger: Logger;
  private currentChromeStyle: ChromeStyle | undefined = undefined;
  private baseClassicNavItemsFn: (() => ClassicNavItem[]) | undefined = undefined;
  private coreStart: CoreStart | undefined = undefined;
  private classicNavFactory: ClassicNavigationFactoryFn | undefined = undefined;
  private onAppMountHandlers: Array<() => Promise<void>> = [];

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public setup(_core: CoreSetup): SearchNavigationPluginSetup {
    return {};
  }

  public start(core: CoreStart): SearchNavigationPluginStart {
    this.coreStart = core;
    core.chrome.getChromeStyle$().subscribe((value) => {
      this.currentChromeStyle = value;
    });

    import('./classic_navigation').then(({ classicNavigationFactory }) => {
      this.classicNavFactory = classicNavigationFactory;
    });

    return {
      handleOnAppMount: this.handleOnAppMount.bind(this),
      registerOnAppMountHandler: this.registerOnAppMountHandler.bind(this),
      setGetBaseClassicNavItems: this.setGetBaseClassicNavItems.bind(this),
      useClassicNavigation: this.useClassicNavigation.bind(this),
    };
  }

  public stop() {}

  private async handleOnAppMount() {
    if (this.onAppMountHandlers.length === 0) return;

    try {
      await Promise.all(this.onAppMountHandlers);
    } catch (e) {
      this.logger.warn('Error handling app mount functions for search navigation');
      this.logger.warn(e);
    }
  }

  private registerOnAppMountHandler(handler: () => Promise<void>) {
    this.onAppMountHandlers.push(handler);
  }

  private setGetBaseClassicNavItems(classicNavItemsFn: () => ClassicNavItem[]) {
    this.baseClassicNavItemsFn = classicNavItemsFn;
  }

  private useClassicNavigation(history: ScopedHistory<unknown>) {
    if (
      this.baseClassicNavItemsFn === undefined ||
      this.classicNavFactory === undefined ||
      this.coreStart === undefined ||
      this.currentChromeStyle !== 'classic'
    )
      return undefined;

    return this.classicNavFactory(this.baseClassicNavItemsFn(), this.coreStart, history);
  }
}
