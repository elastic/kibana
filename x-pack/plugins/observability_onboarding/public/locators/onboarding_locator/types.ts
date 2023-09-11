/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/public';
import { SerializableRecord } from '@kbn/utility-types';

export interface ObservabilityOnboardingLocatorParams
  extends SerializableRecord {
  /** If given, it will load the given map else will load the create a new map page. */
  source?: 'customLogs' | 'systemLogs';
}

export type ObservabilityOnboardingLocator =
  LocatorPublic<ObservabilityOnboardingLocatorParams>;
