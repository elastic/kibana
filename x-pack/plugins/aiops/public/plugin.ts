/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';

import {
  AiopsPluginSetup,
  AiopsPluginSetupDeps,
  AiopsPluginStart,
  AiopsPluginStartDeps,
} from './types';

export class AiopsPlugin
  implements Plugin<AiopsPluginSetup, AiopsPluginStart, AiopsPluginSetupDeps, AiopsPluginStartDeps>
{
  public setup(coreSetup: CoreSetup<AiopsPluginStartDeps>, plugins: AiopsPluginSetupDeps) {
    // importing async to keep the aiops plugin size to a minimum
    Promise.all([
      import('@kbn/ui-actions-plugin/public'),
      import('./categorize_field_actions'),
    ]).then(([uiActionsImports, { categorizeFieldAction }]) => {
      const { CATEGORIZE_FIELD_TRIGGER } = uiActionsImports;
      plugins.uiActions.addTriggerAction(
        CATEGORIZE_FIELD_TRIGGER,
        categorizeFieldAction(coreSetup)
      );
    });
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
