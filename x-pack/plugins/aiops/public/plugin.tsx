/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin } from '@kbn/core/public';
import { type CoreSetup } from '@kbn/core/public';
import { firstValueFrom } from 'rxjs';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
import type {
  AiopsPluginSetup,
  AiopsPluginSetupDeps,
  AiopsPluginStart,
  AiopsPluginStartDeps,
} from './types';
import { getEmbeddableChangePointChart } from './embeddable/embeddable_change_point_chart_component';

export type AiopsCoreSetup = CoreSetup<AiopsPluginStartDeps, AiopsPluginStart>;

export class AiopsPlugin
  implements Plugin<AiopsPluginSetup, AiopsPluginStart, AiopsPluginSetupDeps, AiopsPluginStartDeps>
{
  public setup(
    core: AiopsCoreSetup,
    { embeddable, cases, licensing, uiActions }: AiopsPluginSetupDeps
  ) {
    Promise.all([
      firstValueFrom(licensing.license$),
      import('./embeddable/register_embeddable'),
      import('./ui_actions'),
      import('./cases/register_change_point_charts_attachment'),
      core.getStartServices(),
    ]).then(
      ([
        license,
        { registerEmbeddable },
        { registerAiopsUiActions },
        { registerChangePointChartsAttachment },
        [coreStart, pluginStart],
      ]) => {
        if (license.hasAtLeast('platinum')) {
          if (embeddable) {
            registerEmbeddable(core, embeddable);
          }

          if (uiActions) {
            registerAiopsUiActions(uiActions, coreStart, pluginStart);
          }

          if (cases) {
            registerChangePointChartsAttachment(cases, coreStart, pluginStart);
          }
        }
      }
    );
  }

  public start(core: CoreStart, plugins: AiopsPluginStartDeps): AiopsPluginStart {
    return {
      EmbeddableChangePointChart: getEmbeddableChangePointChart(
        EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
        core,
        plugins
      ),
    };
  }

  public stop() {}
}
