/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SolutionView } from '../../../common';

const searchFeatures = ['enterpriseSearch'];

const obltFeatures = [
  'logs',
  'infrastructure',
  'apm',
  'uptime',
  'observabilityCases',
  'slo',
  'observabilityAIAssistant',
];

const securityFeatures = [
  'siem',
  'securitySolutionCases',
  'securitySolutionAssistant',
  'securitySolutionAttackDiscovery',
];

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
  spaceDisabledFeatures: string[] = [],
  spaceSolution: SolutionView = 'classic'
): string[] {
  let disabledFeatureKeysFromSolution: string[] = [];

  if (spaceSolution === 'es') {
    disabledFeatureKeysFromSolution = [...obltFeatures, ...securityFeatures];
  } else if (spaceSolution === 'oblt') {
    disabledFeatureKeysFromSolution = [...searchFeatures, ...securityFeatures];
  } else if (spaceSolution === 'security') {
    disabledFeatureKeysFromSolution = [...obltFeatures, ...searchFeatures];
  }

  return Array.from(new Set([...spaceDisabledFeatures, ...disabledFeatureKeysFromSolution]));
}
