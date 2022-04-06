/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup } from 'src/core/public';

import { PLUGIN } from '../common/constants';

import { PluginDependencies } from './types';
import { getLinks } from './links';
import { ILicense } from '../../licensing/common/types';

const checkLicenseStatus = (license: ILicense) => {
  const { state, message } = license.check(PLUGIN.id, PLUGIN.minimumLicenseType);
  return state === 'valid' ? { valid: true } : { valid: false, message };
};

export class PainlessLabUIPlugin implements Plugin<void, void, PluginDependencies> {
  public setup(
    { http, getStartServices, uiSettings }: CoreSetup,
    { devTools, home, licensing }: PluginDependencies
  ) {
    home.featureCatalogue.register({
      id: PLUGIN.id,
      title: i18n.translate('xpack.painlessLab.registryProviderTitle', {
        defaultMessage: 'Painless Lab (beta)',
      }),
      description: i18n.translate('xpack.painlessLab.registryProviderDescription', {
        defaultMessage: 'Simulate and debug painless code.',
      }),
      icon: 'empty',
      path: '/app/dev_tools#/painless_lab',
      showOnHomePage: false,
      category: 'admin',
    });

    const devTool = devTools.register({
      id: 'painless_lab',
      order: 7,
      isBeta: true,
      title: i18n.translate('xpack.painlessLab.displayName', {
        defaultMessage: 'Painless Lab',
      }),
      enableRouting: false,
      disabled: false,
      mount: async ({ element, theme$ }) => {
        const [core] = await getStartServices();

        const {
          i18n: { Context: I18nContext },
          notifications,
          docLinks,
          chrome,
        } = core;

        const license = await licensing.license$.pipe(first()).toPromise();
        const licenseStatus = checkLicenseStatus(license);

        if (!licenseStatus.valid) {
          notifications.toasts.addDanger(licenseStatus.message!);
          window.location.hash = '/dev_tools';
          return () => {};
        }

        const { renderApp } = await import('./application');
        const tearDownApp = renderApp(element, {
          I18nContext,
          http,
          uiSettings,
          links: getLinks(docLinks),
          chrome,
          theme$,
        });

        return () => {
          tearDownApp();
        };
      },
    });

    licensing.license$.subscribe((license) => {
      if (!checkLicenseStatus(license).valid && !devTool.isDisabled()) {
        devTool.disable();
      } else if (devTool.isDisabled()) {
        devTool.enable();
      }
    });
  }

  public start() {}

  public stop() {}
}
