/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Plugin, CoreStart, CoreSetup } from 'kibana/public';
import { first } from 'rxjs/operators';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';

import { PLUGIN } from '../common/constants';

import { PluginDependencies } from './types';
import { getLinks } from './links';
import { LanguageService } from './services';

export class PainlessLabUIPlugin implements Plugin<void, void, PluginDependencies> {
  languageService = new LanguageService();

  async setup(
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
      icon: '',
      path: '/app/kibana#/dev_tools/painless_lab',
      showOnHomePage: false,
      category: FeatureCatalogueCategory.ADMIN,
    });

    devTools.register({
      id: 'painless_lab',
      order: 7,
      title: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.painlessLab.displayName', {
              defaultMessage: 'Painless Lab',
            })}
          </EuiFlexItem>

          <EuiFlexItem grow={false} className="painlessLab__betaLabelContainer">
            <EuiBetaBadge
              label={i18n.translate('xpack.painlessLab.displayNameBetaLabel', {
                defaultMessage: 'Beta',
              })}
              tooltipContent={i18n.translate('xpack.painlessLab.displayNameBetaTooltipText', {
                defaultMessage: 'This feature might change drastically in future releases',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) as any,
      enableRouting: false,
      disabled: false,
      mount: async (ctx, { element }) => {
        const [core] = await getStartServices();

        const {
          i18n: { Context: I18nContext },
          notifications,
          docLinks,
          chrome,
        } = core;

        this.languageService.setup();

        const license = await licensing.license$.pipe(first()).toPromise();
        const { state, message: invalidLicenseMessage } = license.check(
          PLUGIN.id,
          PLUGIN.minimumLicenseType
        );
        const isValidLicense = state === 'valid';

        if (!isValidLicense) {
          notifications.toasts.addDanger(invalidLicenseMessage as string);
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
        });

        return () => {
          tearDownApp();
        };
      },
    });
  }

  async start(core: CoreStart, plugins: any) {}

  async stop() {
    this.languageService.stop();
  }
}
