/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from '../../../../src/core/server';
import { Plugin } from './plugin';
import { configSchema } from './config';
// @ts-ignore
import { getKibanaInfoForStats } from './kibana_monitoring/lib';
// @ts-ignore
import { deprecations } from './deprecations';

export const plugin = (initContext: PluginInitializerContext) => new Plugin(initContext);
export const config = {
  schema: configSchema,
};

export { getKibanaInfoForStats, deprecations };
