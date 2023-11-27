/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';
import { LogExplorerLocatorDefinition, LogExplorerLocators } from '../common/locators';
import type { LogExplorerSetupDeps } from './types';

export class LogExplorerServerPlugin implements Plugin {
  private locators?: LogExplorerLocators;

  setup(core: CoreSetup, plugins: LogExplorerSetupDeps) {
    const { share } = plugins;

    // Register Locators
    const logExplorerLocator = share.url.locators.create(
      new LogExplorerLocatorDefinition({
        share,
      })
    );

    this.locators = {
      logExplorerLocator,
    };

    return {
      locators: this.locators,
    };
  }

  start() {}
}
