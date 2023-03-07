/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ServerlessPluginSetup, ServerlessPluginStart } from './types';

export class ServerlessPlugin implements Plugin<ServerlessPluginSetup, ServerlessPluginStart> {
  public setup(_core: CoreSetup): ServerlessPluginSetup {
    return {};
  }

  public start(core: CoreStart): ServerlessPluginStart {
    core.chrome.setChromeStyle('solution');
    return {
      setServerlessNavigation: (navigation: JSX.Element) =>
        core.chrome.setSolutionNavigation(navigation),
    };
  }

  public stop() {}
}
