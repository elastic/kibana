/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import {
  AdvancedUiActionsSetup,
  AdvancedUiActionsStart,
  urlDrilldownGlobalScopeProvider,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { UrlDrilldown } from './lib';

export interface SetupDependencies {
  embeddable: EmbeddableSetup;
  uiActionsEnhanced: AdvancedUiActionsSetup;
}

export interface StartDependencies {
  embeddable: EmbeddableStart;
  uiActionsEnhanced: AdvancedUiActionsStart;
}

// eslint-disable-next-line
export interface SetupContract {}

// eslint-disable-next-line
export interface StartContract {}

export class UrlDrilldownPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies>
{
  constructor(protected readonly context: PluginInitializerContext) {}

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies): SetupContract {
    const startServices = createStartServicesGetter(core.getStartServices);
    plugins.uiActionsEnhanced.registerDrilldown(
      new UrlDrilldown({
        externalUrl: core.http.externalUrl,
        getGlobalScope: urlDrilldownGlobalScopeProvider({ core }),
        navigateToUrl: (url: string) =>
          core.getStartServices().then(([{ application }]) => application.navigateToUrl(url)),
        getSyntaxHelpDocsLink: () =>
          startServices().core.docLinks.links.dashboard.urlDrilldownTemplateSyntax,
        getVariablesHelpDocsLink: () =>
          startServices().core.docLinks.links.dashboard.urlDrilldownVariables,
        uiSettings: core.uiSettings,
      })
    );

    return {};
  }

  public start(core: CoreStart, plugins: StartDependencies): StartContract {
    return {};
  }

  public stop() {}
}
