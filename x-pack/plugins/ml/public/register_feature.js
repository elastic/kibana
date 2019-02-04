/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register(i18n => {
  return {
    id: 'ml',
    title: i18n('xpack.ml.machineLearningTitle', {
      defaultMessage: 'Machine Learning'
    }),
    description: i18n('xpack.ml.machineLearningDescription', {
      defaultMessage: 'Automatically model the normal behavior of your time series data to detect anomalies.'
    }),
    icon: 'machineLearningApp',
    path: '/app/ml',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA
  };
});
