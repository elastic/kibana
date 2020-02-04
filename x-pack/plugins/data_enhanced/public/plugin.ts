/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { setAutocompleteService } from './services';
import { setupKqlQuerySuggestionProvider, KUERY_LANGUAGE_NAME } from './autocomplete';

export interface DataEnhancedPublicSetupDependencies {
  data: DataPublicPluginSetup;
}
export interface DataEnhancedPublicStartDependencies {
  data: DataPublicPluginStart;
}

export type DataEnhancedPublicSetup = ReturnType<DataEnhancedPublicPlugin['setup']>;
export type DataEnhancedPublicStart = ReturnType<DataEnhancedPublicPlugin['start']>;

export class DataEnhancedPublicPlugin implements Plugin {
  public setup(core: CoreSetup, plugins: DataEnhancedPublicSetupDependencies) {
    plugins.data.autocomplete.addQuerySuggestionProvider(
      KUERY_LANGUAGE_NAME,
      setupKqlQuerySuggestionProvider(core)
    );
  }

  public start(core: CoreStart, plugins: DataEnhancedPublicStartDependencies) {
    setAutocompleteService(plugins.data.autocomplete);
  }
}
