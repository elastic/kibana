/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Plugin, CoreStart, CoreSetup, PluginInitializerContext } from 'kibana/public';

import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';
import { LICENSE_CHECK_STATE } from '../../licensing/public';

import { PLUGIN } from '../common/constants';
import { AppPublicPluginDependencies } from './types';
import { LicenseStatus } from '../common/types';

export class SearchProfilerUIPlugin implements Plugin<void, void, AppPublicPluginDependencies> {
  private licenseStatus: LicenseStatus;

  constructor(ctx: PluginInitializerContext) {
    this.licenseStatus = { valid: false };
  }

  async setup(
    { http, getStartServices }: CoreSetup,
    { dev_tools, home, licensing }: AppPublicPluginDependencies
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

    dev_tools.register({
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
        return boot({
          http,
          getLicenseStatus: () => this.licenseStatus,
          el: params.element,
          I18nContext: i18nDep.Context,
          notifications: notifications.toasts,
        });
      },
    });

    licensing.license$.subscribe(license => {
      const { state, message } = license.check(PLUGIN.id, PLUGIN.minimumLicenseType);
      const isAvailable =
        state === LICENSE_CHECK_STATE.Valid && license.getFeature(PLUGIN.id).isAvailable;

      if (isAvailable) {
        this.licenseStatus = { valid: true };
      } else {
        this.licenseStatus = { valid: false, message };
      }
    });
  }

  async start(core: CoreStart, plugins: any) {}

  async stop() {}
}
