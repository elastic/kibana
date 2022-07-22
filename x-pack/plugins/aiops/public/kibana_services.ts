/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { AiOpsStartDependencies } from './plugin';

let coreStart: CoreStart;
let pluginsStart: AiOpsStartDependencies;
export function setStartServices(core: CoreStart, plugins: AiOpsStartDependencies) {
  coreStart = core;
  pluginsStart = plugins;
}

export const getCoreStart = () => coreStart;
export const getPluginsStart = () => pluginsStart;
