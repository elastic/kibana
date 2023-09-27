/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability/locators';

export type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability/locators';
export type ObservabilityOnboardingLocator =
  LocatorPublic<ObservabilityOnboardingLocatorParams>;
