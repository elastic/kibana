/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/public';
import { LicensingPlugin } from './plugin';

export * from '../common/types';
export { LicensingPluginSetup, LicensingPluginStart } from './types';
export const plugin = (context: PluginInitializerContext) => new LicensingPlugin(context);
