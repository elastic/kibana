/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from '../../../../src/core/server';
import { UptimePlugin } from './plugin';

export { initServerWithKibana, KibanaServer } from './kibana.index';
export const plugin = (_initializerContext: PluginInitializerContext) => new UptimePlugin();
