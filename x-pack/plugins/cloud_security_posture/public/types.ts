/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import type { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CspSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CspStart {}

export interface CspPluginSetup {
  data: DataPublicPluginStart;
}
export interface CspPluginStart {
  navigation: NavigationPublicPluginStart;
}
