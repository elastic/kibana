/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer, CoreStart } from 'kibana/public';
import {
  EndpointPlugin,
  EndpointPluginStart,
  EndpointPluginSetup,
  EndpointPluginStartDependencies,
  EndpointPluginSetupDependencies,
} from './plugin';

export const plugin: PluginInitializer<
  EndpointPluginSetup,
  EndpointPluginStart,
  EndpointPluginSetupDependencies,
  EndpointPluginStartDependencies
> = () => new EndpointPlugin();

let endpointCore: CoreStart;

export function initCore(core: CoreStart) {
  if (endpointCore === undefined) {
    endpointCore = core;
  }
}

export function getCore() {
  return endpointCore;
}
