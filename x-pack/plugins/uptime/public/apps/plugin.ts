/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyCoreStart, CoreSetup, CoreStart, AppMountParameters } from 'src/core/public';
import { Plugin } from '../../../../../src/core/public';
import { UMFrontendLibs } from '../lib/lib';
import { PLUGIN } from '../../common';
// @ts-ignore
import { FeatureCatalogueCategory } from '../../../../../src/plugins/home/public';
import { getKibanaFrameworkAdapter } from '../lib/adapters/framework/new_platform_adapter';

export interface StartObject {
  core: LegacyCoreStart;
  plugins: any;
}

export class UptimePlugin implements Plugin {
  constructor() {}

  public async setup(core: CoreSetup, plugins: { home: any }) {
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
      async mount(params: AppMountParameters) {
        const [coreStart, corePlugins] = await core.getStartServices();
        const { element } = params;
        const libs: UMFrontendLibs = {
          framework: getKibanaFrameworkAdapter(coreStart, plugins, corePlugins),
        };
        libs.framework.render(element);
        return () => {};
      },
    });
  }

  public start(start: CoreStart, plugins: {}): void {}

  public stop() {}
}
