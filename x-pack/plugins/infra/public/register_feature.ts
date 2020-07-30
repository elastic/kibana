/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  HomePublicPluginSetup,
  FeatureCatalogueCategory,
  FeatureCatalogueHomePageSection,
} from '../../../../src/plugins/home/public';

export const registerFeatures = (homePlugin: HomePublicPluginSetup) => {
  homePlugin.featureCatalogue.register({
    id: 'metrics',
    title: i18n.translate('xpack.infra.registerFeatures.infraOpsTitle', {
      defaultMessage: 'Metrics',
    }),
    description: i18n.translate('xpack.infra.registerFeatures.infraOpsDescription', {
      defaultMessage: 'Monitor all infrastructure metrics.',
    }),
    icon: 'metricsApp',
    path: `/app/metrics`,
    homePageSection: FeatureCatalogueHomePageSection.SOLUTION_PANEL,
    category: FeatureCatalogueCategory.DATA,
    solution: 'observability',
    order: 210,
  });

  homePlugin.featureCatalogue.register({
    id: 'logs',
    title: i18n.translate('xpack.infra.registerFeatures.logsTitle', {
      defaultMessage: 'Logs',
    }),
    description: i18n.translate('xpack.infra.registerFeatures.logsDescription', {
      defaultMessage:
        'Stream logs in real time or scroll through historical views in a console-like experience.',
    }),
    icon: 'logsApp',
    path: `/app/logs`,
    category: FeatureCatalogueCategory.DATA,
  });
};
