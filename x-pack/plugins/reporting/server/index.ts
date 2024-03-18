/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import type { ReportingConfigType } from '@kbn/reporting-server';

export { config } from './config';

/**
 * Common types that are documented in the Public API
 */
export type { ReportingSetup, ReportingStart } from './types';

// @internal
export const plugin = async (initContext: PluginInitializerContext<ReportingConfigType>) => {
  const { ReportingPlugin } = await import('./plugin');
  return new ReportingPlugin(initContext);
};

// @internal
export { ReportingCore } from './core';
