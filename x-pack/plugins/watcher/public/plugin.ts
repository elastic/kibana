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

import { ILicense, LICENSE_CHECK_STATE } from '../../licensing/public';
import { TimeBuckets, MANAGEMENT_BREADCRUMB } from './legacy';
import { PLUGIN } from '../common/constants';
import { Dependencies } from './types';
import { License } from '../../licensing/common/license';

const licenseToLicenseStatus = (license: License): LicenseStatus => {
  const { state, message } = license.check(PLUGIN.ID, PLUGIN.MINIMUM_LICENSE_REQUIRED);
  return {
    valid: state === LICENSE_CHECK_STATE.Valid && license.getFeature(PLUGIN.ID).isAvailable,
    message,
  };
};

export class WatcherUIPlugin implements Plugin<void, void, Dependencies, any> {
  async setup(
    { application, notifications, http, uiSettings, getStartServices }: CoreSetup,
    { licensing, management, data, home }: Dependencies
  ) {
    const esSection = management.sections.getSection('elasticsearch');
    const initialLicenseStatus = await licensing.license$
      .pipe<ILicense>(first(), map(licenseToLicenseStatus))
      .toPromise();

    if (!initialLicenseStatus.valid) {
      return;
    }

    esSection!.registerApp({
      id: 'watcher',
      title: i18n.translate(
        'xpack.watcher.sections.watchList.managementSection.watcherDisplayName',
        { defaultMessage: 'Watcher' }
      ),
      mount: async ({ element }) => {
        const [core, plugins] = await getStartServices();
        const { chrome, i18n: i18nDep, docLinks, savedObjects } = core;
        const { eui_utils } = plugins as any;
        const { boot } = await import('./application/boot');

        return boot({
          initialLicenseStatus,
          licenseStatus$: licensing.license$.pipe(skip(1), map(licenseToLicenseStatus)),
          element,
          toasts: notifications.toasts,
          http,
          uiSettings,
          docLinks,
          chrome,
          euiUtils: eui_utils,
          savedObjects: savedObjects.client,
          I18nContext: i18nDep.Context,
          createTimeBuckets: () => new TimeBuckets(uiSettings, data),
          MANAGEMENT_BREADCRUMB,
        });
      },
    });

    home.featureCatalogue.register({
      id: 'watcher',
      title: 'Watcher', // This is a product name so we don't translate it.
      category: FeatureCatalogueCategory.ADMIN,
      description: i18n.translate('xpack.watcher.watcherDescription', {
        defaultMessage: 'Detect changes in your data by creating, managing, and monitoring alerts.',
      }),
      icon: 'watchesApp',
      path: '/app/kibana#/management/elasticsearch/watcher/watches',
      showOnHomePage: true,
    });
  }

  start(core: CoreStart) {}

  stop() {}
}
