/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { FileDataVisualizerStartDependencies } from './plugin';

let coreStart: CoreStart;
let pluginsStart: FileDataVisualizerStartDependencies;
export function setStartServices(core: CoreStart, plugins: FileDataVisualizerStartDependencies) {
  coreStart = core;
  pluginsStart = plugins;
}

export const getCoreStart = () => coreStart;
export const getPluginsStart = () => pluginsStart;
