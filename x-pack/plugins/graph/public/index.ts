/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'kibana/public';
import { GraphPlugin } from './plugin';
import { ConfigSchema } from '../config';

export const plugin = (initializerContext: PluginInitializerContext<ConfigSchema>) =>
  new GraphPlugin(initializerContext);

export { GraphSetup } from './plugin';
