/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';

export enum ApmOnboardingLocatorCategory {
  Apm = 'application',
}

export interface ApmOnboardingLocatorParams extends ObservabilityOnboardingLocatorParams {
  category: ApmOnboardingLocatorCategory;
}
