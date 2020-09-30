/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  HomePublicPluginSetup,
  FeatureCatalogueCategory,
} from '../../../../src/plugins/home/public';

export const registerFeature = (home: HomePublicPluginSetup) => {
  // register Transforms so it appears on the Kibana home page
  home.featureCatalogue.register({
    id: 'transform',
    title: i18n.translate('xpack.transform.transformsTitle', {
      defaultMessage: 'Transforms',
    }),
    description: i18n.translate('xpack.transform.transformsDescription', {
      defaultMessage:
        'Use transforms to pivot existing Elasticsearch indices into summarized or entity-centric indices.',
    }),
    icon: 'managementApp', // there is currently no Transforms icon, so using the general management app icon
    path: '/app/management/data/transform',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.ADMIN,
  });
};
