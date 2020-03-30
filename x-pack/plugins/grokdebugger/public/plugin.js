/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { first } from 'rxjs/operators';
import { registerFeature } from './register_feature';
import { PLUGIN } from '../common/constants';

export class Plugin {
  setup(coreSetup, plugins) {
    registerFeature(plugins.home);

    plugins.devTools.register({
      order: 6,
      title: i18n.translate('xpack.grokDebugger.displayName', {
        defaultMessage: 'Grok Debugger',
      }),
      id: PLUGIN.ID,
      enableRouting: false,
      async mount(context, { element }) {
        const [coreStart] = await coreSetup.getStartServices();
        const license = await plugins.licensing.license$.pipe(first()).toPromise();
        const { renderApp } = await import('./render_app');
        return renderApp(license, element, coreStart);
      },
    });
  }

  start() {}

  stop() {}
}
