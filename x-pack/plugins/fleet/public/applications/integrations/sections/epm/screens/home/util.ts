/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCategory } from '../../../../../../../../../../src/plugins/custom_integrations/common';
import { INTEGRATION_CATEGORY_DISPLAY } from '../../../../../../../../../../src/plugins/custom_integrations/common';

import type { IntegrationCardItem } from '../../../../../../../common/types/models';

import type { CategoryFacet } from './category_facets';

export function mergeCategoriesAndCount(
  eprCategoryList: Array<{ id: string; title: string; count: number }>, // EPR-categories from backend call to EPR
  cards: IntegrationCardItem[]
): CategoryFacet[] {
  const facets: CategoryFacet[] = [];

  const addIfMissing = (category: string, count: number, title: string) => {
    const match = facets.find((c) => {
      return c.id === category;
    });

    if (match) {
      match.count += count;
    } else {
      facets.push({
        id: category,
        count,
        title,
      });
    }
  };

  // Seed the list with the dynamic categories
  eprCategoryList.forEach((facet) => {
    addIfMissing(facet.id, 0, facet.title);
  });

  // Count all the categories
  cards.forEach((integration) => {
    integration.categories.forEach((cat: string) => {
      const title = INTEGRATION_CATEGORY_DISPLAY[cat as IntegrationCategory]
        ? INTEGRATION_CATEGORY_DISPLAY[cat as IntegrationCategory]
        : cat;
      addIfMissing(cat, 1, title);
    });
  });

  const filledFacets = facets.filter((facet) => {
    return facet.count > 0;
  });

  filledFacets.sort((a, b) => {
    return a.id.localeCompare(b.id);
  });

  return filledFacets;
}
