/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AppNavLinkStatus,
  DEFAULT_APP_CATEGORIES,
  type AppMountParameters,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import React from 'react';
import ReactDOM from 'react-dom';
import type {
  HighCardinalityIndexerPluginSetup,
  HighCardinalityIndexerPluginSetupDependencies,
  HighCardinalityIndexerPluginStart,
  HighCardinalityIndexerPluginStartDependencies,
} from './types';

export class HighCardinalityIndexerPlugin
  implements
    Plugin<
      HighCardinalityIndexerPluginSetup,
      HighCardinalityIndexerPluginStart,
      HighCardinalityIndexerPluginSetupDependencies,
      HighCardinalityIndexerPluginStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup,
    pluginsSetup: HighCardinalityIndexerPluginSetupDependencies
  ): HighCardinalityIndexerPluginSetup {
    coreSetup.application.register({
      id: 'highCardinalityIndexer',
      title: i18n.translate('xpack.highCardinalityIndexer.appTitle', {
        defaultMessage: 'High Cardinality Indexer',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/highCardinalityIndexer',
      category: DEFAULT_APP_CATEGORIES.observability,
      navLinkStatus: AppNavLinkStatus.hidden,
      deepLinks: [],

      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [{ Application }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices(),
        ]);

        ReactDOM.render(
          <Application
            {...appMountParameters}
            coreStart={coreStart}
            pluginsStart={pluginsStart as HighCardinalityIndexerPluginStartDependencies}
          />,
          appMountParameters.element
        );

        return () => {
          ReactDOM.unmountComponentAtNode(appMountParameters.element);
        };
      },
    });
    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: HighCardinalityIndexerPluginStartDependencies
  ): HighCardinalityIndexerPluginStart {
    return {};
  }
}
