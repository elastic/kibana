/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from 'kibana/public';
import type { LensPluginStartDependencies } from './plugin';

let coreStart: CoreStart;
let pluginsStart: LensPluginStartDependencies;
export function setStartServices(core: CoreStart, plugins: LensPluginStartDependencies) {
  coreStart = core;
  pluginsStart = plugins;
}

export const getUiActions = () => pluginsStart.uiActions;
