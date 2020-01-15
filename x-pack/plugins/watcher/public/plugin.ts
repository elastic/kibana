/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin, CoreStart } from 'kibana/public';
import { TimeBuckets, MANAGEMENT_BREADCRUMB } from './legacy';
import { PLUGIN } from '../common/constants';
import { LICENSE_CHECK_STATE } from '../../licensing/public';
import { Dependencies } from './types';

export class WatcherUIPlugin implements Plugin<void, void, Dependencies, any> {
  hasValidLicense: boolean = false;

  setup(
    { application, notifications, http, uiSettings, getStartServices }: CoreSetup,
    { licensing, management, data }: Dependencies
  ) {
    licensing.license$.subscribe(license => {
      const { state } = license.check(PLUGIN.ID, PLUGIN.MINIMUM_LICENSE_REQUIRED);
      this.hasValidLicense =
        state === LICENSE_CHECK_STATE.Valid && license.getFeature(PLUGIN.ID).isAvailable;

      if (this.hasValidLicense) {
        const esSection = management.sections.getSection('elasticsearch');
        if (esSection) {
          esSection.registerApp({
            id: 'watcher',
            title: 'Watcher',
            mount: async ({ element }) => {
              if (!this.hasValidLicense) {
                return () => undefined;
              }
              const [core, plugins] = await getStartServices();
              const { chrome, i18n, docLinks, savedObjects } = core;
              const { eui_utils } = plugins as any;
              const { boot } = await import('./application/boot');

              const createTimeBuckets = () => new TimeBuckets(uiSettings, data);

              return boot({
                element,
                toasts: notifications.toasts,
                http,
                uiSettings,
                docLinks,
                chrome,
                euiUtils: eui_utils,
                savedObjects: savedObjects.client,
                I18nContext: i18n.Context,
                createTimeBuckets,
                MANAGEMENT_BREADCRUMB,
              });
            },
          });
        }
      }

      //     management.sections.getSection('elasticsearch/watcher').register('watches', {
      //       display: i18n.translate(
      //         'xpack.watcher.sections.watchList.managementSection.watchesDisplayName',
      //         {
      //           defaultMessage: 'Watches',
      //         }
      //       ),
      //       order: 1,
      //     } as any);
      //
      //     management.sections.getSection('elasticsearch/watcher').register('watch', {
      //       visible: false,
      //     } as any);
      //
      //     management.sections.getSection('elasticsearch/watcher/watch').register('status', {
      //       display: i18n.translate(
      //         'xpack.watcher.sections.watchList.managementSection.statusDisplayName',
      //         {
      //           defaultMessage: 'Status',
      //         }
      //       ),
      //       order: 1,
      //       visible: false,
      //     } as any);
      //
      //     management.sections.getSection('elasticsearch/watcher/watch').register('edit', {
      //       display: i18n.translate(
      //         'xpack.watcher.sections.watchList.managementSection.editDisplayName',
      //         {
      //           defaultMessage: 'Edit',
      //         }
      //       ),
      //       order: 2,
      //       visible: false,
      //     } as any);
      //
      //     management.sections.getSection('elasticsearch/watcher/watch').register('new', {
      //       display: i18n.translate(
      //         'xpack.watcher.sections.watchList.managementSection.newWatchDisplayName',
      //         {
      //           defaultMessage: 'New Watch',
      //         }
      //       ),
      //       order: 1,
      //       visible: false,
      //     } as any);
      //
      //     management.sections.getSection('elasticsearch/watcher/watch').register('history-item', {
      //       order: 1,
      //       visible: false,
      //     } as any);
    });
  }

  start(core: CoreStart) {}

  stop() {}
}
