/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin } from './plugin';
import { PluginInitializerContext } from 'src/core/server';
import * as constants from '../common/constants';

export { getTelemetryOptIn } from './get_telemetry_opt_in'
export const plugin = (initializerContext: PluginInitializerContext) => new Plugin();
export { constants }
