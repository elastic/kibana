/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup } from 'src/core/public';

import { ILicense } from '../../licensing/common/types';

import { PLUGIN } from '../common';
import { AppPublicPluginDependencies } from './types';
import { SearchProfilerLocatorDefinition } from './locator';

const checkLicenseStatus = (license: ILicense) => {
  const { state, message } = license.check(PLUGIN.id, PLUGIN.minimumLicenseType);
  return state === 'valid' ? { valid: true } : { valid: false, message };
};

export class SearchProfilerUIPlugin implements Plugin<void, void, AppPublicPluginDependencies> {
  public setup(
    { http, getStartServices }: CoreSetup,
    { devTools, home, licensing, share }: AppPublicPluginDependencies
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
      path: '/app/dev_tools#/searchprofiler',
      showOnHomePage: false,
      category: 'admin',
    });

    const devTool = devTools.register({
      id: 'searchprofiler',
      title: i18n.translate('xpack.searchProfiler.pageDisplayName', {
        defaultMessage: 'Search Profiler',
      }),
      order: 5,
      enableRouting: false,
      mount: async (params) => {
        const [coreStart] = await getStartServices();
        const { notifications, i18n: i18nDep } = coreStart;
        const { renderApp } = await import('./application');

        const license = await licensing.license$.pipe(first()).toPromise();
        const initialLicenseStatus = checkLicenseStatus(license);

        return renderApp({
          http,
          initialLicenseStatus,
          el: params.element,
          I18nContext: i18nDep.Context,
          notifications: notifications.toasts,
          theme$: params.theme$,
          location: params.location,
        });
      },
    });

    licensing.license$.subscribe((license) => {
      if (!checkLicenseStatus(license).valid && !devTool.isDisabled()) {
        devTool.disable();
      } else if (devTool.isDisabled()) {
        devTool.enable();
      }
    });

    share.url.locators.create(new SearchProfilerLocatorDefinition());
  }

  public start() {}

  public stop() {}
}
