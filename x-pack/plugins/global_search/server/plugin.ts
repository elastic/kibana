/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/server';
import { LicensingPluginStart } from '../../licensing/server';
import { LicenseChecker, ILicenseChecker } from '../common/license_checker';
import { SearchService, SearchServiceStart } from './services';
import { registerRoutes } from './routes';
import {
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
  GlobalSearchRequestHandlerContext,
} from './types';
import { GlobalSearchConfigType } from './config';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GlobalSearchPluginSetupDeps {}
export interface GlobalSearchPluginStartDeps {
  licensing: LicensingPluginStart;
}

export class GlobalSearchPlugin
  implements
    Plugin<
      GlobalSearchPluginSetup,
      GlobalSearchPluginStart,
      GlobalSearchPluginSetupDeps,
      GlobalSearchPluginStartDeps
    > {
  private readonly config$: Observable<GlobalSearchConfigType>;
  private readonly searchService = new SearchService();
  private searchServiceStart?: SearchServiceStart;
  private licenseChecker?: ILicenseChecker;

  constructor(context: PluginInitializerContext) {
    this.config$ = context.config.create<GlobalSearchConfigType>();
  }

  public async setup(core: CoreSetup<{}, GlobalSearchPluginStart>) {
    const config = await this.config$.pipe(take(1)).toPromise();
    const { registerResultProvider } = this.searchService.setup({
      basePath: core.http.basePath,
      config,
    });

    registerRoutes(core.http.createRouter());

    core.http.registerRouteHandlerContext<GlobalSearchRequestHandlerContext, 'globalSearch'>(
      'globalSearch',
      (_, req) => {
        return {
          find: (term, options) => this.searchServiceStart!.find(term, options, req),
          getSearchableTypes: () => this.searchServiceStart!.getSearchableTypes(req),
        };
      }
    );

    return {
      registerResultProvider,
    };
  }

  public start(core: CoreStart, { licensing }: GlobalSearchPluginStartDeps) {
    this.licenseChecker = new LicenseChecker(licensing.license$);
    this.searchServiceStart = this.searchService.start({
      core,
      licenseChecker: this.licenseChecker,
    });
    return {
      find: this.searchServiceStart.find,
      getSearchableTypes: this.searchServiceStart.getSearchableTypes,
    };
  }

  public stop() {
    if (this.licenseChecker) {
      this.licenseChecker.clean();
    }
  }
}
