/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomIntegration } from '../../../../../../../../../../src/plugins/custom_integrations/common';

import type { CategoryFacet } from './category_facets';

export function mergeAndReplaceCategoryCounts(
  eprCounts: CategoryFacet[],
  addableIntegrations: CustomIntegration[]
): CategoryFacet[] {
  addableIntegrations.forEach((integration) => {
    integration.categories.forEach((cat) => {
      const match = eprCounts.find((c) => {
        return c.id === cat;
      });

      if (match) {
        match.count += 1;
      } else {
        eprCounts.push({
          id: cat,
          count: 1,
        });
      }
    });
  });

  eprCounts.sort((a, b) => {
    return a.id.localeCompare(b.id);
  });

  return eprCounts;
}
