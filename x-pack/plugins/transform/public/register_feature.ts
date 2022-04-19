/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
<<<<<<< HEAD
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
=======
import { HomePublicPluginSetup, FeatureCatalogueCategory } from '@kbn/home-plugin/public';
>>>>>>> upstream/main

export const registerFeature = (home: HomePublicPluginSetup) => {
  // register Transforms so it appears on the Kibana home page
  home.featureCatalogue.register({
    id: 'transform',
    title: i18n.translate('xpack.transform.transformsTitle', {
      defaultMessage: 'Transforms',
    }),
    description: i18n.translate('xpack.transform.transformsDescription', {
      defaultMessage:
        'Use transforms to pivot existing Elasticsearch indices into summarized entity-centric indices or to create an indexed view of the latest documents for fast access.',
    }),
    icon: 'managementApp', // there is currently no Transforms icon, so using the general management app icon
    path: '/app/management/data/transform',
    showOnHomePage: false,
    category: 'admin',
  });
};
