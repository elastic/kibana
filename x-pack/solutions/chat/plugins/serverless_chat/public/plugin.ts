/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

import type {
  ChatServerlessPluginSetup,
  ChatServerlessPluginStart,
  ChatServerlessPluginSetupDeps,
  ChatServerlessPluginStartDeps,
} from './types';
import { createNavigationTree } from './navigation_tree';

export class ChatServerlessPlugin
  implements
    Plugin<
      ChatServerlessPluginSetup,
      ChatServerlessPluginStart,
      ChatServerlessPluginSetupDeps,
      ChatServerlessPluginStartDeps
    >
{
  constructor() {}

  public setup(
    core: CoreSetup,
    setupDeps: ChatServerlessPluginSetupDeps
  ): ChatServerlessPluginSetup {
    return {};
  }

  public start(
    core: CoreStart,
    { serverless }: ChatServerlessPluginStartDeps
  ): ChatServerlessPluginStart {
    const navigationTree$ = of(createNavigationTree());

    serverless.initNavigation('chat', navigationTree$);

    return {};
  }

  public stop() {}
}
