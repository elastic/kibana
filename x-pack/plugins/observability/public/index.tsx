/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, CoreSetup, CoreStart } from '../../../../src/core/public';
export { ExampleSharedComponent } from './components/example_shared_component';

interface ObservabilitySetup {
  getBP: () => string;
}

// convention calls for usually moving this Plugin class into its own
// file called plugin.ts, sitting next to this index file
class Plugin {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): ObservabilitySetup {
    // called when plugin is setting up

    return {
      getBP() {
        return 'o11y + ' + core.http.basePath.get();
      },
    };
  }

  public start(core: CoreStart) {
    // called after all plugins are set up
  }

  public stop() {
    // called when plugin is torn down, aka window.onbeforeunload
  }
}

export function plugin(initializerContext: PluginInitializerContext) {
  return new Plugin(initializerContext);
}
