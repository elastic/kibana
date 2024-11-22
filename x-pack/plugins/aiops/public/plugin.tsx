/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin } from '@kbn/core/public';
import { type CoreSetup } from '@kbn/core/public';
import { firstValueFrom } from 'rxjs';

import { getChangePointDetectionComponent } from './shared_components';
import { LogCategorizationForDiscover as PatternAnalysisComponent } from './shared_lazy_components';
import type {
  AiopsPluginSetup,
  AiopsPluginSetupDeps,
  AiopsPluginStart,
  AiopsPluginStartDeps,
} from './types';
import { registerEmbeddables } from './embeddables';
import { registerAiopsUiActions } from './ui_actions';
import { registerCases } from './cases/register_cases';

export type AiopsCoreSetup = CoreSetup<AiopsPluginStartDeps, AiopsPluginStart>;

export class AiopsPlugin
  implements Plugin<AiopsPluginSetup, AiopsPluginStart, AiopsPluginSetupDeps, AiopsPluginStartDeps>
{
  public setup(
    core: AiopsCoreSetup,
    { embeddable, cases, licensing, uiActions }: AiopsPluginSetupDeps
  ) {
    Promise.all([firstValueFrom(licensing.license$), core.getStartServices()]).then(
      ([license, [coreStart, pluginStart]]) => {
        const { canUseAiops } = coreStart.application.capabilities.ml;

        if (license.hasAtLeast('platinum') && canUseAiops) {
          if (embeddable) {
            registerEmbeddables(embeddable, core);
          }

          if (uiActions) {
            registerAiopsUiActions(uiActions, coreStart, pluginStart);
          }

          if (cases) {
            registerCases(cases, coreStart, pluginStart);
          }
        }
      }
    );
  }

  public start(core: CoreStart, plugins: AiopsPluginStartDeps): AiopsPluginStart {
    return {
      ChangePointDetectionComponent: getChangePointDetectionComponent(core, plugins),
      getPatternAnalysisAvailable: async () => {
        const { getPatternAnalysisAvailable } = await import(
          './components/log_categorization/log_categorization_enabled'
        );
        return getPatternAnalysisAvailable(plugins.licensing);
      },
      PatternAnalysisComponent,
    };
  }

  public stop() {}
}
