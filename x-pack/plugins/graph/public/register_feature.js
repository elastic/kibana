/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';

FeatureCatalogueRegistryProvider.register((Private) => {
  const xpackInfo = Private(XPackInfoProvider);
  if (!xpackInfo.get('features.graph.showAppLink') || !xpackInfo.get('features.graph.enableAppLink')) {
    return null;
  }

  return {
    id: 'graph',
    title: 'Graph',
    description: 'Surface and analyze relevant relationships in your Elasticsearch data.',
    icon: 'graphApp',
    path: '/app/graph',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA
  };
});
