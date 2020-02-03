/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  MapsPlugin,
  MapsPluginSetup,
  MapsPluginStart,
} from './plugin';
import {PluginInitializer, PluginInitializerContext} from 'kibana/public';

export const plugin: PluginInitializer<MapsPluginSetup, MapsPluginStart> = (
  context: PluginInitializerContext
) => {
  return new MapsPlugin(context);
};
