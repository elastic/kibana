/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { LicensingPlugin } from './plugin';

export const plugin = (context: PluginInitializerContext) => new LicensingPlugin(context);

export * from '../common/types';
export * from './types';
export { config } from './licensing_config';
