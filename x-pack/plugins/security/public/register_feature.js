/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';

FeatureCatalogueRegistryProvider.register((Private) => {
  const xpackInfo = Private(XPackInfoProvider);
  if (!xpackInfo.get('features.security.showLinks')) {
    return null;
  }

  return {
    id: 'security',
    title: 'Security Settings',
    description: 'Protect your data and easily manage who has access to what with users and roles.',
    icon: 'securityApp',
    path: '/app/kibana#/management/security',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN
  };
});
