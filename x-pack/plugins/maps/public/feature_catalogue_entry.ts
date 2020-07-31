/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { APP_ID, APP_ICON } from '../common/constants';
import { getAppTitle } from '../common/i18n_getters';
import {
  FeatureCatalogueCategory,
  FeatureCatalogueHomePageSection,
} from '../../../../src/plugins/home/public';

export const featureCatalogueEntry = {
  id: APP_ID,
  title: getAppTitle(),
  description: i18n.translate('xpack.maps.feature.appDescription', {
    defaultMessage: 'Plot geographic data.',
  }),
  icon: APP_ICON,
  path: '/app/maps',
  homePageSection: FeatureCatalogueHomePageSection.SOLUTION_PANEL,
  category: FeatureCatalogueCategory.DATA,
  solution: 'kibana',
  order: 440,
};
