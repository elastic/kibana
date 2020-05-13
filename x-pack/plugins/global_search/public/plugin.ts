/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { GlobalSearchPluginSetup, GlobalSearchPluginStart } from './types';
import { GlobalSearchConfigType } from './config';
import { SearchService } from './services';

export class GlobalSearchPlugin
  implements Plugin<GlobalSearchPluginSetup, GlobalSearchPluginStart> {
  private readonly config: GlobalSearchConfigType;

  constructor(context: PluginInitializerContext) {
    this.config = context.config.get<GlobalSearchConfigType>();
  }
  private readonly searchService = new SearchService();

  setup(core: CoreSetup) {
    const searchSetup = this.searchService.setup({ config: this.config });

    return {
      ...searchSetup,
    };
  }

  start({ http, application }: CoreStart) {
    const searchStart = this.searchService.start({ http, application });

    return {
      ...searchStart,
    };
  }
}
