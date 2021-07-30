/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin, CoreSetup, AppMountParameters } from 'src/core/public';
import type { SpacesPluginStart } from '../../spaces/public';
import { getServices } from './services';

interface PluginStartDeps {
  spaces?: SpacesPluginStart;
}

export class NotesTestPlugin implements Plugin<{}, {}, {}, PluginStartDeps> {
  public setup(core: CoreSetup<PluginStartDeps>) {
    core.application.register({
      id: 'notesTest',
      title: 'Notes test',
      async mount(appMountParams: AppMountParameters) {
        const [coreStart, pluginStartDeps] = await core.getStartServices();
        const services = getServices(coreStart);
        const { http } = coreStart;
        const { spaces: spacesApi } = pluginStartDeps;
        const { renderApp } = await import('./app');
        return renderApp({ services, appMountParams, http, spacesApi });
      },
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
