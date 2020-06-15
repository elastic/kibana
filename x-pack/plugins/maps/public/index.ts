/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer } from 'kibana/public';
import { PluginInitializerContext } from 'kibana/public';
import { MapsPlugin, MapsPluginSetup, MapsPluginStart } from './plugin';
import { MapsXPackConfig } from '../config';

export const plugin: PluginInitializer<MapsPluginSetup, MapsPluginStart> = (
  initContext: PluginInitializerContext<MapsXPackConfig>
) => {
  // @ts-ignore
  return new MapsPlugin(initContext);
};

export { MAP_SAVED_OBJECT_TYPE } from '../common/constants';
