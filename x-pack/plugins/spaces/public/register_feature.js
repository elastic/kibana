/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'spaces',
    title: 'Spaces',
    description: 'You know, for space.',
    icon: '/plugins/kibana/assets/app_security.svg',
    path: '/app/kibana#/management/spaces/list',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN
  };
});
