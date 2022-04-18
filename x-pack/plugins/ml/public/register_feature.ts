/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FeatureCatalogueCategory, HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { PLUGIN_ID } from '../common/constants/app';

export const registerFeature = (home: HomePublicPluginSetup) => {
  // register ML so it appears on the Kibana home page
  home.featureCatalogue.register({
    id: PLUGIN_ID,
    title: i18n.translate('xpack.ml.machineLearningTitle', {
      defaultMessage: 'Machine Learning',
    }),
    subtitle: i18n.translate('xpack.ml.machineLearningSubtitle', {
      defaultMessage: 'Model, predict, and detect.',
    }),
    description: i18n.translate('xpack.ml.machineLearningDescription', {
      defaultMessage:
        'Automatically model the normal behavior of your time series data to detect anomalies.',
    }),
    icon: 'machineLearningApp',
    path: '/app/ml',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.DATA,
    solutionId: 'kibana',
    order: 500,
  });
};
