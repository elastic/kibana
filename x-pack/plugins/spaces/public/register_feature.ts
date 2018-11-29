/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FeatureCatalogueCategory,
  FeatureCatalogueRegistryProvider,
  // @ts-ignore
} from 'ui/registry/feature_catalogue';
import { SPACES_FEATURE_DESCRIPTION } from './lib/constants';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'spaces',
    title: 'Spaces',
    description: SPACES_FEATURE_DESCRIPTION,
    icon: 'spacesApp',
    path: '/app/kibana#/management/spaces/list',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN,
  };
});
