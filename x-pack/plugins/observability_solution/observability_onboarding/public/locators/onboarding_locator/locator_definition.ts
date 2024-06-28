/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/public';
import {
  ObservabilityOnboardingLocatorParams,
  OBSERVABILITY_ONBOARDING_LOCATOR,
} from '@kbn/deeplinks-observability/locators';

export type { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability/locators';

export class ObservabilityOnboardingLocatorDefinition
  implements LocatorDefinition<ObservabilityOnboardingLocatorParams>
{
  public readonly id = OBSERVABILITY_ONBOARDING_LOCATOR;

  public readonly getLocation = async (params: ObservabilityOnboardingLocatorParams = {}) => {
    const { getLocation } = await import('./get_location');
    return getLocation(params);
  };
}
