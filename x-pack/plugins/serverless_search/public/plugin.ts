/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  ServerlessSearchPluginSetup,
  ServerlessSearchPluginSetupDependencies,
  ServerlessSearchPluginStart,
  ServerlessSearchPluginStartDependencies,
} from './types';

export class ServerlessSearchPlugin
  implements Plugin<ServerlessSearchPluginSetup, ServerlessSearchPluginStart>
{
  public setup(
    _core: CoreSetup,
    _setupDeps: ServerlessSearchPluginSetupDependencies
  ): ServerlessSearchPluginSetup {
    return {};
  }

  public start(
    _core: CoreStart,
    _startDeps: ServerlessSearchPluginStartDependencies
  ): ServerlessSearchPluginStart {
    return {};
  }

  public stop() {}
}
