/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin, CoreStart } from 'kibana/public';
import { first, map, skip } from 'rxjs/operators';

import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';

import { LicenseStatus } from '../common/types/license_status';

import { ILicense } from '../../licensing/public';
import { PLUGIN } from '../common/constants';
import { Dependencies } from './types';

const licenseToLicenseStatus = (license: ILicense): LicenseStatus => {
  const { state, message } = license.check(PLUGIN.ID, PLUGIN.MINIMUM_LICENSE_REQUIRED);
  return {
    valid: state === 'valid' && license.getFeature(PLUGIN.ID).isAvailable,
    message,
  };
};

export class WatcherUIPlugin implements Plugin<void, void, Dependencies, any> {
  setup(
    { notifications, http, uiSettings, getStartServices }: CoreSetup,
    { licensing, management, data, home, charts }: Dependencies
  ) {
    const esSection = management.sections.section.insightsAndAlerting;

    const watcherESApp = esSection.registerApp({
      id: 'watcher',
      title: i18n.translate(
        'xpack.watcher.sections.watchList.managementSection.watcherDisplayName',
        { defaultMessage: 'Watcher' }
      ),
      order: 3,
      mount: async ({ element, setBreadcrumbs, history }) => {
        const [core] = await getStartServices();
        const { i18n: i18nDep, docLinks, savedObjects, application } = core;
        const { boot } = await import('./application/boot');
        const { TimeBuckets } = await import('./legacy');

        return boot({
          // Skip the first license status, because that's already been used to determine
          // whether to include Watcher.
          licenseStatus$: licensing.license$.pipe(skip(1), map(licenseToLicenseStatus)),
          element,
          toasts: notifications.toasts,
          http,
          uiSettings,
          docLinks,
          setBreadcrumbs,
          theme: charts.theme,
          savedObjects: savedObjects.client,
          I18nContext: i18nDep.Context,
          createTimeBuckets: () => new TimeBuckets(uiSettings, data),
          history,
          getUrlForApp: application.getUrlForApp,
        });
      },
    });

    // TODO: Fix the below dependency on `home` plugin inner workings
    // Because the home feature catalogue does not have enable/disable functionality we pass
    // the config in but keep a reference for enabling and disabling showing on home based on
    // license updates.
    const watcherHome = {
      id: 'watcher',
      title: 'Watcher', // This is a product name so we don't translate it.
      category: FeatureCatalogueCategory.ADMIN,
      description: i18n.translate('xpack.watcher.watcherDescription', {
        defaultMessage: 'Detect changes in your data by creating, managing, and monitoring alerts.',
      }),
      icon: 'watchesApp',
      path: '/app/management/insightsAndAlerting/watcher/watches',
      showOnHomePage: false,
    };

    home.featureCatalogue.register(watcherHome);

    licensing.license$.pipe(first(), map(licenseToLicenseStatus)).subscribe(({ valid }) => {
      // NOTE: We enable the plugin by default instead of disabling it by default because this
      // creates a race condition that can cause the app nav item to not render in the side nav.
      // The race condition still exists, but it will result in the item rendering when it shouldn't
      // (e.g. on a license it's not available for), instead of *not* rendering when it *should*,
      // which is a less frustrating UX.
      if (valid) {
        watcherESApp.enable();
        watcherHome.showOnHomePage = true;
      } else {
        watcherESApp.disable();
      }
    });
  }

  start(core: CoreStart) {}

  stop() {}
}
