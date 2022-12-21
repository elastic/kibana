/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { firstValueFrom } from 'rxjs';

import { PLUGIN } from '../common/constants';
import { registerFeature } from './register_feature';

export class GrokDebuggerUIPlugin {
  setup(coreSetup, plugins) {
    registerFeature(plugins.home);

    const devTool = plugins.devTools.register({
      order: 6,
      title: i18n.translate('xpack.grokDebugger.displayName', {
        defaultMessage: 'Grok Debugger',
      }),
      id: PLUGIN.ID,
      enableRouting: false,
      async mount({ element, theme$ }) {
        const [coreStart] = await coreSetup.getStartServices();
        const license = await firstValueFrom(plugins.licensing.license$);
        const { renderApp } = await import('./render_app');
        return renderApp(license, element, coreStart, theme$);
      },
    });

    plugins.licensing.license$.subscribe((license) => {
      if (!license.isActive && !devTool.isDisabled()) {
        devTool.disable();
      } else if (devTool.isDisabled()) {
        devTool.enable();
      }
    });
  }

  start() {}

  stop() {}
}
