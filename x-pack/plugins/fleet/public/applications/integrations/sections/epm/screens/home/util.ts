/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CustomIntegration,
  Category,
} from '../../../../../../../../../../src/plugins/custom_integrations/common';

import type { PackageListItem } from '../../../../../../../common/types/models';

import type { CategoryFacet } from './category_facets';

export function mergeAndReplaceCategoryCounts(
  eprCounts: CategoryFacet[],
  addableIntegrations: CustomIntegration[]
): CategoryFacet[] {
  const merged: CategoryFacet[] = [];

  const addIfMissing = (category: string, count: number) => {
    const match = merged.find((c) => {
      return c.id === category;
    });

    if (match) {
      match.count += count;
    } else {
      merged.push({
        id: category as Category,
        count,
      });
    }
  };

  eprCounts.forEach((facet) => {
    addIfMissing(facet.id, facet.count);
  });
  addableIntegrations.forEach((integration) => {
    integration.categories.forEach((cat) => {
      addIfMissing(cat, 1);
    });
  });

  merged.sort((a, b) => {
    return a.id.localeCompare(b.id);
  });

  return merged;
}

export function findReplacementsForEprPackage(
  replacements: CustomIntegration[],
  packageName: string,
  category: Category,
  release: 'beta' | 'experimental' | 'ga'
): CustomIntegration[] {
  if (release === 'ga') {
    return [];
  }

  const filtered = replacements.filter((customIntegration: CustomIntegration) => {
    return (
      customIntegration.eprOverlap === packageName &&
      (!category || customIntegration.categories.includes(category))
    );
  });
  return filtered;
}

export function mergeEprPackagesWithReplacements(
  eprPackages: PackageListItem[],
  replacements: CustomIntegration[],
  category: Category
): Array<PackageListItem | CustomIntegration> {
  const merged: Array<PackageListItem | CustomIntegration> = [];
  eprPackages.forEach((eprPackage) => {
    const hits = findReplacementsForEprPackage(
      replacements,
      eprPackage.name,
      category,
      eprPackage.release
    );
    if (hits.length) {
      merged.push(...hits);
    } else {
      merged.push(eprPackage);
    }
  });

  return merged;
}
