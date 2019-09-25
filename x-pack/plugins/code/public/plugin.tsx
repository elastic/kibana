/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup, CoreStart } from 'kibana/public';
import moment from 'moment';
// import { render, unmountComponentAtNode } from 'react-dom';
import chrome from 'ui/chrome';

import { APP_TITLE } from '../../../legacy/plugins/code/common/constants';
// import { HelpMenu } from '../../../legacy/plugins/code/public/components/help_menu';

export class CorePluginBPlugin implements Plugin<CorePluginBPluginSetup, CorePluginBPluginStart> {
  public setup(core: CoreSetup) {
    console.log(`## new platform code setup`);
    core.application.register({
      id: 'code',
      title: 'Code',
      euiIconType: 'codeApp',
      async mount(context, params) {
        const { renderApp } = await import('./application');
        return renderApp(context, params);
      },
    });
  }

  public start(coreStart: CoreStart) {
    console.log(`## new platform code start`);
    // `getInjected` is not currently available in new platform `coreStart.chrome`
    if (chrome.getInjected('codeUiEnabled')) {
      // TODO the entire Kibana uses moment, we might need to move it to a more common place
      moment.locale(i18n.getLocale());

      coreStart.chrome.setBreadcrumbs([
        {
          text: APP_TITLE,
          href: '#/',
        },
      ]);

      // coreStart.chrome.setHelpExtension(domNode => {
      //   render(<HelpMenu />, domNode);
      //   return () => {
      //     unmountComponentAtNode(domNode);
      //   };
      // });
    }
  }
  public stop() {
    console.log(`## new platform code stop`);
  }
}

export type CorePluginBPluginSetup = ReturnType<CorePluginBPlugin['setup']>;
export type CorePluginBPluginStart = ReturnType<CorePluginBPlugin['start']>;
