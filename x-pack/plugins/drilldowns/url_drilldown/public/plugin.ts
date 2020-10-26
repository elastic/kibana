/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { EmbeddableSetup, EmbeddableStart } from '../../../../../src/plugins/embeddable/public';
import {
  AdvancedUiActionsSetup,
  AdvancedUiActionsStart,
  urlDrilldownGlobalScopeProvider,
} from '../../../ui_actions_enhanced/public';
import { UrlDrilldown } from './lib';
import { createStartServicesGetter } from '../../../../../src/plugins/kibana_utils/public';

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
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies> {
  constructor(protected readonly context: PluginInitializerContext) {}

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies): SetupContract {
    const startServices = createStartServicesGetter(core.getStartServices);
    plugins.uiActionsEnhanced.registerDrilldown(
      new UrlDrilldown({
        getGlobalScope: urlDrilldownGlobalScopeProvider({ core }),
        navigateToUrl: (url: string) =>
          core.getStartServices().then(([{ application }]) => application.navigateToUrl(url)),
        getSyntaxHelpDocsLink: () =>
          startServices().core.docLinks.links.dashboard.urlDrilldownTemplateSyntax,
        getVariablesHelpDocsLink: () =>
          startServices().core.docLinks.links.dashboard.urlDrilldownVariables,
      })
    );

    return {};
  }

  public start(core: CoreStart, plugins: StartDependencies): StartContract {
    return {};
  }

  public stop() {}
}
