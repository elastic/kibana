/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
<<<<<<< HEAD
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
=======
import { FeatureCatalogueCategory, HomePublicPluginSetup } from '@kbn/home-plugin/public';
>>>>>>> upstream/main
import { ManagementSetup } from '@kbn/management-plugin/public';
import { IndexManagementPluginSetup } from '@kbn/index-management-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { rollupBadgeExtension, rollupToggleExtension } from './extend_index_management';
import { UIM_APP_NAME } from '../common';
// @ts-ignore
import { setHttp, init as initDocumentation } from './crud_app/services';
import { setNotifications, setFatalErrors, setUiStatsReporter } from './kibana_services';
import { ClientConfigType } from './types';

export interface RollupPluginSetupDependencies {
  home?: HomePublicPluginSetup;
  management: ManagementSetup;
  indexManagement?: IndexManagementPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export class RollupPlugin implements Plugin {
  constructor(private ctx: PluginInitializerContext) {}

  setup(
    core: CoreSetup,
    { home, management, indexManagement, usageCollection }: RollupPluginSetupDependencies
  ) {
    const {
      ui: { enabled: isRollupUiEnabled },
    } = this.ctx.config.get<ClientConfigType>();

    setFatalErrors(core.fatalErrors);
    if (usageCollection) {
      setUiStatsReporter(usageCollection.reportUiCounter.bind(usageCollection, UIM_APP_NAME));
    }

    if (indexManagement) {
      indexManagement.extensionsService.addBadge(rollupBadgeExtension);
      indexManagement.extensionsService.addToggle(rollupToggleExtension);
    }

    if (home && isRollupUiEnabled) {
      home.featureCatalogue.register({
        id: 'rollup_jobs',
        title: 'Rollups',
        description: i18n.translate('xpack.rollupJobs.featureCatalogueDescription', {
          defaultMessage:
            'Summarize and store historical data in a smaller index for future analysis.',
        }),
        icon: 'indexRollupApp',
        path: `/app/management/data/rollup_jobs/job_list`,
        showOnHomePage: false,
        category: 'admin',
      });
    }

    if (isRollupUiEnabled) {
      const pluginName = i18n.translate('xpack.rollupJobs.appTitle', {
        defaultMessage: 'Rollup Jobs',
      });

      management.sections.section.data.registerApp({
        id: 'rollup_jobs',
        title: pluginName,
        order: 4,
        async mount(params) {
          const [coreStart] = await core.getStartServices();

          const {
            chrome: { docTitle },
          } = coreStart;

          docTitle.change(pluginName);
          params.setBreadcrumbs([{ text: pluginName }]);

          const { renderApp } = await import('./application');
          const unmountAppCallback = await renderApp(core, params);

          return () => {
            docTitle.reset();
            unmountAppCallback();
          };
        },
      });
    }
  }

  start(core: CoreStart) {
    setHttp(core.http);
    setNotifications(core.notifications);
    initDocumentation(core.docLinks);
  }
}
