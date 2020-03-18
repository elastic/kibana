/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export class Plugin {
  setup(coreSetup, plugins) {
    plugins.devTools.register({
      order: 6,
      title: i18n.translate('xpack.grokDebugger.displayName', {
        defaultMessage: 'Grok Debugger',
      }),
      id: 'grokdebugger',
      enableRouting: false,
      disabled: false, // TODO: Address this via licensing plugin //!xpackInfo.get('features.grokdebugger.enableLink', false),
      tooltipContent: 'Tooltip', // TODO: Address via licensing plugin xpackInfo.get('features.grokdebugger.message'),
      async mount(context, { element }) {
        // TODO: Address all of this via licensing plugin
        // const licenseCheck = {
        //   showPage: xpackInfo.get('features.grokdebugger.enableLink'),
        //   message: xpackInfo.get('features.grokdebugger.message'),
        // };
        // if (!licenseCheck.showPage) {
        //   npStart.core.notifications.toasts.addDanger(licenseCheck.message);
        //   window.location.hash = '/dev_tools';
        //   return () => {};
        // }
        const [coreStart] = await coreSetup.getStartServices();
        const { renderApp } = await import('./render_app');
        return renderApp(element, coreStart);
      },
    });
  }

  start() {}

  stop() {}
}
