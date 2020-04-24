/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { ApmPluginSetup, ApmPluginStart } from './types';

export class ApmPlugin implements Plugin<ApmPluginSetup, ApmPluginStart> {
  public setup(core: CoreSetup): ApmPluginSetup {
    return {};
  }

  public start(core: CoreStart): ApmPluginStart {
    return {};
  }

  public stop() {}
}
