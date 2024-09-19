/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaFeature } from '@kbn/features-plugin/server';

import type { SolutionView } from '../../../common';

const getFeatureIdsForCategories = (
  features: KibanaFeature[],
  categories: Array<'observability' | 'enterpriseSearch' | 'securitySolution'>
) => {
  return features
    .filter((feature) =>
      feature.category
        ? categories.includes(
            feature.category.id as 'observability' | 'enterpriseSearch' | 'securitySolution'
          )
        : false
    )
    .map((feature) => feature.id);
};

/**
 * When a space has a `solution` defined, we want to disable features that are not part of that solution.
 * This function takes the current space's disabled features and the space solution and returns
 * the updated array of disabled features.
 *
 * @param spaceDisabledFeatures The current space's disabled features
 * @param spaceSolution The current space's solution (es, oblt, security or classic)
 * @returns The updated array of disabled features
 */
export function withSpaceSolutionDisabledFeatures(
  features: KibanaFeature[],
  spaceDisabledFeatures: string[] = [],
  spaceSolution: SolutionView = 'classic'
): string[] {
  if (spaceSolution === 'classic') {
    return spaceDisabledFeatures;
  }

  let disabledFeatureKeysFromSolution: string[] = [];

  if (spaceSolution === 'es') {
    disabledFeatureKeysFromSolution = getFeatureIdsForCategories(features, [
      'observability',
      'securitySolution',
    ]);
  } else if (spaceSolution === 'oblt') {
    disabledFeatureKeysFromSolution = getFeatureIdsForCategories(features, [
      'enterpriseSearch',
      'securitySolution',
    ]);
  } else if (spaceSolution === 'security') {
    disabledFeatureKeysFromSolution = getFeatureIdsForCategories(features, [
      'observability',
      'enterpriseSearch',
    ]);
  }

  return Array.from(new Set([...disabledFeatureKeysFromSolution]));
}
