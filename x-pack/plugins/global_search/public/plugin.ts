/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { LicenseChecker, ILicenseChecker } from '../common/license_checker';
import { GlobalSearchPluginSetup, GlobalSearchPluginStart } from './types';
import { GlobalSearchClientConfigType } from './config';
import { SearchService } from './services';

export interface GlobalSearchPluginSetupDeps {
  licensing: LicensingPluginSetup;
}

export class GlobalSearchPlugin
  implements
    Plugin<GlobalSearchPluginSetup, GlobalSearchPluginStart, GlobalSearchPluginSetupDeps, {}> {
  private readonly config: GlobalSearchClientConfigType;
  private licenseChecker?: ILicenseChecker;
  private readonly searchService = new SearchService();

  constructor(context: PluginInitializerContext) {
    this.config = context.config.get<GlobalSearchClientConfigType>();
  }

  setup(core: CoreSetup<{}, GlobalSearchPluginStart>, { licensing }: GlobalSearchPluginSetupDeps) {
    this.licenseChecker = new LicenseChecker(licensing.license$);

    const { registerResultProvider } = this.searchService.setup({
      config: this.config,
      licenseChecker: this.licenseChecker,
    });

    return {
      registerResultProvider,
    };
  }

  start({ http, application }: CoreStart) {
    const { find } = this.searchService.start({ http, application });

    return {
      find,
    };
  }

  public stop() {
    if (this.licenseChecker) {
      this.licenseChecker.clean();
    }
  }
}
