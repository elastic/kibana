/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import partition from 'lodash/partition';

import { FEATURED_INTEGRATIONS_BY_CATEGORY } from '@kbn/custom-integrations-plugin/common';

import type { Props as PackageListGridProps } from '../package_list_grid';

type Category = PackageListGridProps['selectedCategory'];

export function _promoteFeaturedIntegrations(
  featuredIntegrationsByCategory: Partial<Record<Category, string[]>>,
  packageList: PackageListGridProps['list'],
  selectedCategory: Category
) {
  const featuredIntegrationNames = featuredIntegrationsByCategory[selectedCategory];

  if (!featuredIntegrationNames) return packageList;

  const [featuredIntegrations, otherIntegrations] = partition(packageList, (card) =>
    featuredIntegrationNames.includes(card.name)
  );

  // Create a new array to keep the order and all matched integrations
  const orderedFeaturedIntegrations = [];
  for (const name of featuredIntegrationNames) {
    const matchingIntegrations = featuredIntegrations.filter(
      ({ name: integrationName }) => integrationName === name
    );
    orderedFeaturedIntegrations.push(...matchingIntegrations);
  }

  return [...orderedFeaturedIntegrations, ...otherIntegrations];
}

export const promoteFeaturedIntegrations = _promoteFeaturedIntegrations.bind(
  null,
  FEATURED_INTEGRATIONS_BY_CATEGORY
);
