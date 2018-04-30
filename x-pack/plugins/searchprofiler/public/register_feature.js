/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'searchprofiler',
    title: 'Search Profiler',
    description: 'Quickly check the performance of any Elasticsearch query.',
    icon: '/plugins/searchprofiler/assets/app_search_profiler.svg',
    path: '/app/kibana#/dev_tools/searchprofiler',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.ADMIN
  };
});
