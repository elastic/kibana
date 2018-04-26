/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'watcher',
    title: 'Watcher',
    description: 'Detect changes in your data by creating, managing, and monitoring alerts.',
    icon: '/plugins/watcher/assets/app_watches.svg',
    path: '/app/kibana#/management/elasticsearch/watcher/watches',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN
  };
});
