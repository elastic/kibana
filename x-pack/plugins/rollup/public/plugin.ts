/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { rollupBadgeExtension, rollupToggleExtension } from './extend_index_management';
// @ts-ignore
import { RollupIndexPatternCreationConfig } from './index_pattern_creation/rollup_index_pattern_creation_config';
// @ts-ignore
import { RollupIndexPatternListConfig } from './index_pattern_list/rollup_index_pattern_list_config';
import { CONFIG_ROLLUPS, UIM_APP_NAME } from '../common';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { IndexManagementPluginSetup } from '../../index_management/public';
import { IndexPatternManagementSetup } from '../../../../src/plugins/index_pattern_management/public';
// @ts-ignore
import { setEsBaseAndXPackBase, setHttp } from './crud_app/services/index';
import { setNotifications, setFatalErrors, setUiStatsReporter } from './kibana_services';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';

export interface RollupPluginSetupDependencies {
  home?: HomePublicPluginSetup;
  management: ManagementSetup;
  indexManagement?: IndexManagementPluginSetup;
  indexPatternManagement: IndexPatternManagementSetup;
  usageCollection?: UsageCollectionSetup;
}

export class RollupPlugin implements Plugin {
  setup(
    core: CoreSetup,
    {
      home,
      management,
      indexManagement,
      indexPatternManagement,
      usageCollection,
    }: RollupPluginSetupDependencies
  ) {
    setFatalErrors(core.fatalErrors);
    if (usageCollection) {
      setUiStatsReporter(usageCollection.reportUiStats.bind(usageCollection, UIM_APP_NAME));
    }

    if (indexManagement) {
      indexManagement.extensionsService.addBadge(rollupBadgeExtension);
      indexManagement.extensionsService.addToggle(rollupToggleExtension);
    }

    const isRollupIndexPatternsEnabled = core.uiSettings.get(CONFIG_ROLLUPS);

    if (isRollupIndexPatternsEnabled) {
      indexPatternManagement.creation.addCreationConfig(RollupIndexPatternCreationConfig);
      indexPatternManagement.list.addListConfig(RollupIndexPatternListConfig);
    }

    if (home) {
      home.featureCatalogue.register({
        id: 'rollup_jobs',
        title: 'Rollups',
        description: i18n.translate('xpack.rollupJobs.featureCatalogueDescription', {
          defaultMessage:
            'Summarize and store historical data in a smaller index for future analysis.',
        }),
        icon: 'indexRollupApp',
        path: `/app/management/data/rollup_jobs/job_list`,
        showOnHomePage: true,
        category: FeatureCatalogueCategory.ADMIN,
      });
    }

    management.sections.section.data.registerApp({
      id: 'rollup_jobs',
      title: i18n.translate('xpack.rollupJobs.appTitle', { defaultMessage: 'Rollup Jobs' }),
      order: 4,
      async mount(params) {
        params.setBreadcrumbs([
          {
            text: i18n.translate('xpack.rollupJobs.breadcrumbsTitle', {
              defaultMessage: 'Rollup Jobs',
            }),
          },
        ]);
        const { renderApp } = await import('./application');

        return renderApp(core, params);
      },
    });
  }

  start(core: CoreStart) {
    setHttp(core.http);
    setNotifications(core.notifications);
    setEsBaseAndXPackBase(core.docLinks.ELASTIC_WEBSITE_URL, core.docLinks.DOC_LINK_VERSION);
  }
}
