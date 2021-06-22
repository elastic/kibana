/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'src/core/public';
import { getDefaultLayoutSelectors } from '../common';
import { getSharedComponents } from './components';
import { ReportingAPIClient } from './lib/reporting_api_client';
import { ReportingPublicPlugin } from './plugin';

export interface ReportingSetup {
  getDefaultLayoutSelectors: typeof getDefaultLayoutSelectors;
  usesUiCapabilities: () => boolean;
  components: ReturnType<typeof getSharedComponents>;
}

export type ReportingStart = ReportingSetup;

export { constants, getDefaultLayoutSelectors } from '../common';
export { ReportingAPIClient, ReportingPublicPlugin as Plugin };

export function plugin(initializerContext: PluginInitializerContext) {
  return new ReportingPublicPlugin(initializerContext);
}
