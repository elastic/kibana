/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPluginStart } from '../../../security/server';
import type { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/server';

export interface StartDeps {
  security?: SecurityPluginStart;
}
export interface SetupDeps {
  usageCollection: UsageCollectionSetup;
}
