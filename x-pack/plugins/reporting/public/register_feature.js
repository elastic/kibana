/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'reporting',
    title: 'Reporting',
    description: 'Manage your reports generated from Discover, Visualize, and Dashboard.',
    icon: '/plugins/reporting/assets/app_reporting.svg',
    path: '/app/kibana#/management/kibana/reporting',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.ADMIN
  };
});
