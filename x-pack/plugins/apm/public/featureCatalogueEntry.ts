/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  FeatureCatalogueCategory,
  FeatureCatalogueHomePageSection,
} from '../../../../src/plugins/home/public';

export const featureCatalogueEntry = {
  id: 'apm',
  title: 'APM',
  description: i18n.translate('xpack.apm.apmDescription', {
    defaultMessage: 'Trace application requests.',
  }),
  icon: 'apmApp',
  path: '/app/apm',
  homePageSection: FeatureCatalogueHomePageSection.SOLUTION_PANEL,
  category: FeatureCatalogueCategory.DATA,
  solution: 'observability',
  order: 200,
};
