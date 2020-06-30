/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CanvasServiceFactory } from '.';
import { CoreStart, CoreSetup, CanvasSetupDeps, CanvasStartDeps } from '../plugin';

interface PlatformService {
  coreSetup: CoreSetup;
  coreStart: CoreStart;
  setupPlugins: CanvasSetupDeps;
  startPlugins: CanvasStartDeps;
}

export const platformServiceFactory: CanvasServiceFactory<PlatformService> = (
  coreSetup,
  coreStart,
  setupPlugins,
  startPlugins
) => {
  return { coreSetup, coreStart, setupPlugins, startPlugins };
};
