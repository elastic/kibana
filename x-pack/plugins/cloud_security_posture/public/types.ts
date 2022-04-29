/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CspClientPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CspClientPluginStart {}

export interface CspClientPluginSetupDeps {
  // required
  data: DataPublicPluginSetup;

  // optional
}

export interface CspClientPluginStartDeps {
  // required
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  // optional
}
