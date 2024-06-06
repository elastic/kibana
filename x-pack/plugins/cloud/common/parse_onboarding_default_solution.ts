/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnBoardingDefaultSolution } from './types';

/**
 * Cloud does not type the value of the "use case" that is set during onboarding for a deployment. Any string can
 * be passed. This function maps the known values to the Kibana values.
 *
 * @param value The solution value set by Cloud.
 * @returns The default solution value for onboarding that matches Kibana naming.
 */
export function parseOnboardingSolution(value?: string): OnBoardingDefaultSolution | undefined {
  if (!value) return;

  const solutions: Array<{
    cloudValue: 'elasticsearch' | 'observability' | 'security';
    kibanaValue: OnBoardingDefaultSolution;
  }> = [
    {
      cloudValue: 'elasticsearch',
      kibanaValue: 'es',
    },
    {
      cloudValue: 'observability',
      kibanaValue: 'oblt',
    },
    {
      cloudValue: 'security',
      kibanaValue: 'security',
    },
  ];

  return solutions.find(({ cloudValue }) => value.toLowerCase() === cloudValue)?.kibanaValue;
}
