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
  home.featureCatalogue.register({
    id: 'transform',
    title: i18n.translate('xpack.transform.transformsTitle', {
      defaultMessage: 'Transforms',
    }),
    description: i18n.translate('xpack.transform.transformsDescription', {
      defaultMessage:
        'Use transforms to pivot existing Elasticsearch indices into summarized or entity-centric indices.',
    }),
    icon: 'managementApp',
    path: '/app/kibana#/management/elasticsearch/transform',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN,
  });
};
