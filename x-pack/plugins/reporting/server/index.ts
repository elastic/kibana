/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'kibana/server';
import { ReportingConfigType } from './config';
import { ReportingPlugin } from './plugin';

export { config } from './config';

/**
 * Common types that are documented in the Public API
 */
export type { ReportingSetup, ReportingStart } from './types';

// @internal
export const plugin = (initContext: PluginInitializerContext<ReportingConfigType>) =>
  new ReportingPlugin(initContext);

// @internal
export type { ReportingConfig } from './config/config';
// @internal
export { ReportingCore } from './core';
