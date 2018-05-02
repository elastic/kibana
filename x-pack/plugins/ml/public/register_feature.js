/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'ml',
    title: 'Machine Learning',
    description: 'Automatically model the normal behavior of your time series data to detect anomalies.',
    icon: '/plugins/ml/assets/app_ml.svg',
    path: '/app/ml',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA
  };
});
