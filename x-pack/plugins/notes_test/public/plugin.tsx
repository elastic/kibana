/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin, CoreSetup, AppMountParameters } from 'src/core/public';
import { getServices } from './services';

export class NotesTestPlugin implements Plugin<{}, {}, {}, {}> {
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'notesTest',
      title: 'Notes test',
      async mount(appMountParams: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        const services = getServices(coreStart);
        const { renderApp } = await import('./app');
        return renderApp({ services, appMountParams });
      },
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
