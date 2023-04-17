/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin } from '@kbn/core/public';
import { firstValueFrom } from 'rxjs';

import {
  AiopsPluginSetup,
  AiopsPluginSetupDeps,
  AiopsPluginStart,
  AiopsPluginStartDeps,
} from './types';

export class AiopsPlugin
  implements Plugin<AiopsPluginSetup, AiopsPluginStart, AiopsPluginSetupDeps, AiopsPluginStartDeps>
{
  public setup() {
    return {};
  }

  public start(core: CoreStart, plugins: AiopsPluginStartDeps) {
    // importing async to keep the aiops plugin size to a minimum
    Promise.all([
      import('@kbn/ui-actions-plugin/public'),
      import('./components/log_categorization'),
      firstValueFrom(plugins.licensing.license$),
    ]).then(([uiActionsImports, { categorizeFieldAction }, license]) => {
      if (license.hasAtLeast('platinum')) {
        const { ACTION_CATEGORIZE_FIELD, CATEGORIZE_FIELD_TRIGGER } = uiActionsImports;
        if (plugins.uiActions.hasAction(ACTION_CATEGORIZE_FIELD)) {
          plugins.uiActions.unregisterAction(ACTION_CATEGORIZE_FIELD);
        }

        plugins.uiActions.addTriggerAction(
          CATEGORIZE_FIELD_TRIGGER,
          categorizeFieldAction(core, plugins)
        );
      }
    });

    return {};
  }

  public stop() {}
}
