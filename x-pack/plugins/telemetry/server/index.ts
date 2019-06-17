/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { TelemetryPlugin } from './plugin';
import * as constants from '../common/constants';

export { getTelemetryOptIn } from './get_telemetry_opt_in';
export const telemetryPlugin = (initializerContext: PluginInitializerContext) =>
  new TelemetryPlugin();
export { constants };
