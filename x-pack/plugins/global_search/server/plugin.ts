/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { LicenseChecker, ILicenseChecker } from '../common/license_checker';
import { SearchService, SearchServiceStart } from './services';
import { registerRoutes } from './routes';
import {
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
  RouteHandlerGlobalSearchContext,
} from './types';
import { GlobalSearchConfigType } from './config';

declare module 'src/core/server' {
  interface RequestHandlerContext {
    globalSearch?: RouteHandlerGlobalSearchContext;
  }
}

export interface GlobalSearchPluginSetupDeps {
  licensing: LicensingPluginSetup;
}

export class GlobalSearchPlugin
  implements
    Plugin<GlobalSearchPluginSetup, GlobalSearchPluginStart, GlobalSearchPluginSetupDeps, {}> {
  private readonly config$: Observable<GlobalSearchConfigType>;
  private readonly searchService = new SearchService();
  private searchServiceStart?: SearchServiceStart;
  private licenseChecker?: ILicenseChecker;

  constructor(context: PluginInitializerContext) {
    this.config$ = context.config.create<GlobalSearchConfigType>();
  }

  public async setup(
    core: CoreSetup<{}, GlobalSearchPluginStart>,
    { licensing }: GlobalSearchPluginSetupDeps
  ) {
    this.licenseChecker = new LicenseChecker(licensing.license$);

    const config = await this.config$.pipe(take(1)).toPromise();
    const { registerResultProvider } = this.searchService.setup({
      basePath: core.http.basePath,
      licenseChecker: this.licenseChecker,
      config,
    });

    registerRoutes(core.http.createRouter());

    core.http.registerRouteHandlerContext('globalSearch', (_, req) => {
      return {
        find: (term, options) => this.searchServiceStart!.find(term, options, req),
      };
    });

    return {
      registerResultProvider,
    };
  }

  public start(core: CoreStart) {
    this.searchServiceStart = this.searchService.start(core);
    return {
      find: this.searchServiceStart.find,
    };
  }

  public stop() {
    if (this.licenseChecker) {
      this.licenseChecker.clean();
    }
  }
}
