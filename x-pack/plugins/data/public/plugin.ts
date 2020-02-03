/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { DataPublicPluginStart, DataPublicPluginSetup } from '../../../../src/plugins/data/public';
import { setAutocompleteService } from './services';
import { setupKqlQuerySuggestionProvider, KUERY_LANGUAGE_NAME } from './autocomplete';

export interface DataPublicSetupDependencies {
  data: DataPublicPluginSetup;
}
export interface DataPublicStartDependencies {
  data: DataPublicPluginStart;
}

export type DataPublicSetup = ReturnType<DataPublicPlugin['setup']>;
export type DataPublicStart = ReturnType<DataPublicPlugin['start']>;

export class DataPublicPlugin implements Plugin {
  public setup(core: CoreSetup, plugins: DataPublicSetupDependencies) {
    plugins.data.autocomplete.addQuerySuggestionProvider(
      KUERY_LANGUAGE_NAME,
      setupKqlQuerySuggestionProvider(core)
    );
  }

  public start(core: CoreStart, plugins: DataPublicStartDependencies) {
    setAutocompleteService(plugins.data.autocomplete);
  }
}
