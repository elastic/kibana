/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Plugin, CoreStart, CoreSetup, PluginInitializerContext } from 'kibana/public';
import { first } from 'rxjs/operators';

import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';

import { PLUGIN } from '../common';
import { AppPublicPluginDependencies } from './types';

export class SearchProfilerUIPlugin implements Plugin<void, void, AppPublicPluginDependencies> {
  constructor(ctx: PluginInitializerContext) {}

  async setup(
    { http, getStartServices }: CoreSetup,
    { devTools, home, licensing }: AppPublicPluginDependencies
  ) {
    home.featureCatalogue.register({
      id: PLUGIN.id,
      title: i18n.translate('xpack.searchProfiler.registryProviderTitle', {
        defaultMessage: 'Search Profiler',
      }),
      description: i18n.translate('xpack.searchProfiler.registryProviderDescription', {
        defaultMessage: 'Quickly check the performance of any Elasticsearch query.',
      }),
      icon: 'searchProfilerApp',
      path: '/app/kibana#/dev_tools/searchprofiler',
      showOnHomePage: false,
      category: FeatureCatalogueCategory.ADMIN,
    });

    devTools.register({
      id: 'searchprofiler',
      title: i18n.translate('xpack.searchProfiler.pageDisplayName', {
        defaultMessage: 'Search Profiler',
      }),
      order: 5,
      enableRouting: false,
      mount: async (ctx, params) => {
        const [coreStart] = await getStartServices();
        const { notifications, i18n: i18nDep } = coreStart;
        const { boot } = await import('./application/boot');

        const license = await licensing.license$.pipe(first()).toPromise();
        const { state, message } = license.check(PLUGIN.id, PLUGIN.minimumLicenseType);
        const initialLicenseStatus =
          state === 'valid' ? { valid: true } : { valid: false, message };

        return boot({
          http,
          initialLicenseStatus,
          el: params.element,
          I18nContext: i18nDep.Context,
          notifications: notifications.toasts,
        });
      },
    });
  }

  async start(core: CoreStart, plugins: any) {}

  async stop() {}
}
