/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { first, map, skip } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { ILicense } from '@kbn/licensing-plugin/public';
import { Dependencies, LicenseStatus } from './types';
import { getThemingInfo } from './get_theming_info';
import { PLUGIN } from './constants';

const licenseToLicenseStatus = (license: ILicense): LicenseStatus => {
  const { state, message } = license.check(PLUGIN.ID, PLUGIN.MINIMUM_LICENSE_REQUIRED);
  return {
    valid: state === 'valid',
    message,
  };
};

export class WhitelabellingPlugin implements Plugin {
  constructor(context: PluginInitializerContext) {}

  setup(
    { getStartServices, notifications, http, uiSettings }: CoreSetup,
    { licensing, management }: Dependencies
  ) {
    const kibanaSection = management.sections.section.kibana;
    const pluginName = i18n.translate(
      'xpack.whitelabelling.sections.managementSection.whitelabellingDisplayName',
      { defaultMessage: 'Whitelabelling' }
    );
    const whitelabellingApp = kibanaSection.registerApp({
      id: 'whitelabelling',
      title: pluginName,
      order: 5,
      mount: async ({ element, setBreadcrumbs, history, theme$ }) => {
        const [coreStart] = await getStartServices();
        const {
          chrome: { docTitle },
          i18n: i18nDep,
          docLinks,
          savedObjects,
          application,
          executionContext,
        } = coreStart;

        docTitle.change(pluginName);

        const { renderApp } = await import('./application');

        const unmountAppCallback = renderApp({
          // Skip the first license status, because that's already been used to determine
          // whether to include Watcher.
          licenseStatus$: licensing.license$.pipe(skip(1), map(licenseToLicenseStatus)),
          element,
          toasts: notifications.toasts,
          http,
          uiSettings,
          setBreadcrumbs,
          savedObjects: savedObjects.client,
          I18nContext: i18nDep.Context,
          history,
          getUrlForApp: application.getUrlForApp,
          theme$,
          executionContext,
        });

        return () => {
          unmountAppCallback();
        };
      },
    });
    combineLatest([licensing.license$.pipe(first(), map(licenseToLicenseStatus))]).subscribe(
      ([{ valid }]) => {
        // NOTE: We enable the plugin by default instead of disabling it by default because this
        // creates a race condition that can cause the app nav item to not render in the side nav.
        // The race condition still exists, but it will result in the item rendering when it shouldn't
        // (e.g. on a license it's not available for), instead of *not* rendering when it *should*,
        // which is a less frustrating UX.
        if (valid) {
          whitelabellingApp.enable();
        } else {
          whitelabellingApp.disable();
        }
      }
    );
    return {};
  }

  start(core: CoreStart) {
    const { http, chrome } = core;
    chrome.registerWhitelabellingPlugin('whitelabelling');
    getThemingInfo(http).then(({ theming }) => {
      if (theming.logo) {
        chrome.setCustomLogo(theming.logo);
      }
      if (theming.mark) {
        chrome.setCustomMark(theming.mark);
      }
    });

    return {};
  }
}
