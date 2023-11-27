/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginSetup as PublicServerSharePluginSetup } from '@kbn/share-plugin/public';
import type { SharePluginSetup as ServerSharePluginSetup } from '@kbn/share-plugin/server';

export interface LogExplorerLocatorDependencies {
  share: PublicServerSharePluginSetup | ServerSharePluginSetup;
}
