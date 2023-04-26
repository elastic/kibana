/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import ReactDOM from 'react-dom';
import React from 'react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { CoreSetup, CoreStart, Plugin, CoreTheme } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { HttpStart } from '@kbn/core-http-browser';

import { ServerlessPluginSetup, ServerlessPluginStart } from './types';
import { Switcher } from './components';

export class ServerlessPlugin implements Plugin<ServerlessPluginSetup, ServerlessPluginStart> {
  public setup(_core: CoreSetup): ServerlessPluginSetup {
    return {};
  }

  public start(core: CoreStart): ServerlessPluginStart {
    core.chrome.setChromeStyle('project');

    if (process.env.NODE_ENV !== 'production') {
      core.chrome.navControls.registerRight({
        order: 500,
        mount: (target) => this.mount(target, core.theme.theme$, core.http),
      });
    }

    return {
      setServerlessNavigation: (navigation: JSX.Element) =>
        core.chrome.replaceProjectSideNav(navigation),
    };
  }

  public stop() {}

  private mount(targetDomElement: HTMLElement, theme$: Rx.Observable<CoreTheme>, http: HttpStart) {
    ReactDOM.render(
      <KibanaThemeProvider theme$={theme$}>
        <I18nProvider>
          <Switcher http={http} />
        </I18nProvider>
      </KibanaThemeProvider>,
      targetDomElement
    );

    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
