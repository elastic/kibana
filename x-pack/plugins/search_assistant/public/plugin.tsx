/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type Plugin, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { createAppService } from '@kbn/ai-assistant';
import ReactDOM from 'react-dom';
import React from 'react';
import type {
  SearchAssistantPluginSetup,
  SearchAssistantPluginStart,
  SearchAssistantPluginStartDependencies,
} from './types';
import { NavControlInitiator } from './components/nav_control/lazy_nav_control';

export interface PublicConfigType {
  ui: {
    enabled: boolean;
  };
}

export class SearchAssistantPlugin
  implements
    Plugin<
      SearchAssistantPluginSetup,
      SearchAssistantPluginStart,
      {},
      SearchAssistantPluginStartDependencies
    >
{
  private readonly config: PublicConfigType;

  constructor(private readonly context: PluginInitializerContext) {
    this.config = this.context.config.get();
  }

  public setup(
    core: CoreSetup<SearchAssistantPluginStartDependencies, SearchAssistantPluginStart>
  ): SearchAssistantPluginSetup {
    return {};
  }

  public start(
    coreStart: CoreStart,
    pluginsStart: SearchAssistantPluginStartDependencies
  ): SearchAssistantPluginStart {
    if (!this.config.ui.enabled) {
      return {};
    }
    const appService = createAppService({
      pluginsStart,
    });
    const isEnabled = appService.isEnabled();

    if (!isEnabled) {
      return {};
    }

    coreStart.chrome.navControls.registerRight({
      mount: (element) => {
        ReactDOM.render(
          <NavControlInitiator
            appService={appService}
            coreStart={coreStart}
            pluginsStart={pluginsStart}
          />,
          element,
          () => {}
        );

        return () => {};
      },
      // right before the user profile
      order: 1001,
    });

    return {};
  }

  public stop() {}
}
