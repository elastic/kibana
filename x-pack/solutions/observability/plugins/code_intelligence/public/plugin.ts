/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

const APP_ID = 'codeIntelligence';

export type CodeIntelligencePublicSetup = void;
export type CodeIntelligencePublicStart = void;

export interface CodeIntelligenceStartDependencies {
  agentBuilder?: AgentBuilderPluginStart;
}

export class CodeIntelligencePublicPlugin
  implements
    Plugin<
      CodeIntelligencePublicSetup,
      CodeIntelligencePublicStart,
      object,
      CodeIntelligenceStartDependencies
    >
{
  public setup(core: CoreSetup<CodeIntelligenceStartDependencies>): void {
    const startServices = core.getStartServices();

    core.application.register({
      id: APP_ID,
      title: i18n.translate('xpack.codeIntelligence.appTitle', {
        defaultMessage: 'Code Intelligence',
      }),
      appRoute: `/app/${APP_ID}`,
      category: DEFAULT_APP_CATEGORIES.observability,
      euiIconType: 'logoObservability',
      order: 8990,
      keywords: ['code intelligence', 'catalog', 'repositories'],
      mount: async (params: AppMountParameters) => {
        const [[coreStart, plugins], { renderApp }] = await Promise.all([
          startServices,
          import('./application'),
        ]);
        return renderApp(coreStart, plugins, params);
      },
    });
  }

  public start(): void {}
}
