/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'grokdebugger',
    title: 'Grok Debugger',
    description: 'Simulate and debug grok patterns for data transformation on ingestion.',
    icon: '/plugins/grokdebugger/assets/app_grok.svg',
    path: '/app/kibana#/dev_tools/grokdebugger',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.ADMIN
  };
});
