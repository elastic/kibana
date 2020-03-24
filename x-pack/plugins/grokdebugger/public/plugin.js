/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { first } from 'rxjs/operators';
import { registerFeature } from './register_feature';
import { PLUGIN } from '../common/constants';

const inactiveLicenseMessage = i18n.translate('xpack.grokDebugger.clientInactiveLicenseError', {
  defaultMessage: 'The Grok Debugger tool requires an active license.',
});

export class Plugin {
  setup(coreSetup, plugins) {
    registerFeature(plugins.home);

    this.licensing = plugins.licensing;

    this.licensing.license$.pipe(first()).subscribe(license => {
      plugins.devTools.register({
        order: 6,
        title: i18n.translate('xpack.grokDebugger.displayName', {
          defaultMessage: 'Grok Debugger',
        }),
        id: PLUGIN,
        enableRouting: false,
        disabled: !license.isActive,
        tooltipContent: !license.isActive ? inactiveLicenseMessage : null,
        async mount(context, { element }) {
          const [coreStart] = await coreSetup.getStartServices();
          const { renderApp } = await import('./render_app');
          return renderApp(element, coreStart);
        },
      });
    });
  }

  start(coreStart) {
    this.licensing.license$.subscribe(license => {
      coreStart.chrome.navLinks.update(PLUGIN, {
        hidden: !license.isActive,
      });
    });
  }

  stop() {}
}
