/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSearchPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSearchPluginStart {}

export interface StartDependencies {
  security: SecurityPluginStart;
}
export interface SetupDependencies {
  ml: MlPluginSetup;
}
