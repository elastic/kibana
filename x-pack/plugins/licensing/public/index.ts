/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110902
/* eslint-disable @kbn/eslint/no_export_all */

import { PluginInitializerContext } from 'src/core/public';
import { LicensingPlugin } from './plugin';

export * from '../common/types';
export { LicensingPluginSetup, LicensingPluginStart } from './types';
export const plugin = (context: PluginInitializerContext) => new LicensingPlugin(context);
