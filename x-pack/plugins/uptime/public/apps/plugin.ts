/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  LegacyCoreStart,
  // PluginInitializerContext,
  CoreSetup,
  CoreStart,
  AppMountParameters,
} from 'src/core/public';
// import { PluginsStart } from '../../../../../src/' 'ui/new_platform/new_platform';
// import { Chrome } from 'ui/chrome';
import { Plugin } from '../../../../../src/core/public';
import { UMFrontendLibs } from '../lib/lib';
import { PLUGIN } from '../../common';
// import { getKibanaFrameworkAdapter } from '../lib/adapters/framework/new_platform_adapter';
// import template from './template.html';
// import { UptimeApp } from '../uptime_app';
// @ts-ignore
import { createApolloClient } from '../lib/adapters/framework/apollo_client_adapter';
// @ts-ignore
import { FeatureCatalogueCategory } from '../../../../../src/plugins/home/public';
import { getKibanaFrameworkAdapter } from '../lib/adapters/framework/new_platform_adapter';
// import { renderApp } from './render_app';

export interface StartObject {
  core: LegacyCoreStart;
  plugins: any;
}
console.log('adapter', getKibanaFrameworkAdapter);

export class UptimePlugin implements Plugin {
  // private el: HTMLElement | undefined;
  constructor() // @ts-ignore this is added to satisfy the New Platform typing constraint,
  // but we're not leveraging any of its functionality yet.
  // private readonly initializerContext: PluginInitializerContext,
  // private readonly chrome: Chrome
  {
    // this.el = undefined;
    // this.chrome = chrome;
  }

  public async setup(core: CoreSetup, plugins: { home: any }) {
    // console.log('core setup', core);

    // console.log('plugins from setup', plugins);
    // console.log(plugins.home);

    if (plugins.home) {
      plugins.home.featureCatalogue.register({
        id: PLUGIN.ID,
        title: PLUGIN.TITLE,
        description: PLUGIN.DESCRIPTION,
        icon: 'uptimeApp',
        path: '/app/uptime#/',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.DATA,
      });
    }

    core.application.register({
      appRoute: '/app/uptime#/',
      id: PLUGIN.ID,
      euiIconType: 'uptimeApp',
      order: 8900,
      title: PLUGIN.TITLE,
      // description: PLUGIN.DESCRIPTION,
      async mount(params: AppMountParameters) {
        const [coreStart, b] = await core.getStartServices();
        const { element } = params;
        const libs: UMFrontendLibs = {
          framework: getKibanaFrameworkAdapter(coreStart, plugins, b),
        };
        // console.log(libs);
        console.log('corestart from mount', coreStart);
        libs.framework.render(element);
        return () => {};
        // console.log('value after setting el', this.el);
        // return renderApp(element);
      },
    });
  }

  public start(start: CoreStart, plugins: {}): void {
    // console.log('corestart from start:', start);
    // const {
    //   data: { autocomplete },
    // } = plugins;
    // console.log('autocomplete', autocomplete);
    // // const {
    // //   core,
    // //   plugins: {
    // //     data: { autocomplete },
    // //   },
    // // } = start;
    // const libs: UMFrontendLibs = {
    //   framework: getKibanaFrameworkAdapter(start, autocomplete),
    // };
    // console.log('value of el', this.el);
    // libs.framework.render(UptimeApp, createApolloClient, this.el);
    // // // @ts-ignore improper type description
    // // // this.chrome.setRootTemplate(template);
    // // const checkForRoot = () => {
    // //   return new Promise(resolve => {
    // //     const ready = !!document.getElementById(PLUGIN.APP_ROOT_ID);
    // //     if (ready) {
    // //       resolve();
    // //     } else {
    // //       setTimeout(() => resolve(checkForRoot()), 10);
    // //     }
    // //   });
    // // };
    // // checkForRoot().then(() => {
    // //   libs.framework.render(UptimeApp, createApolloClient);
    // // });
  }

  public stop() {}
}
