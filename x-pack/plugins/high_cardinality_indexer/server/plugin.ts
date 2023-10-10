/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { mapValues } from 'lodash';

import { registerServerRoutes } from './routes/register_routes';
import { HighCardinalityIndexerRouteHandlerResources } from './routes/types';
import {
  HighCardinalityIndexerPluginSetup,
  HighCardinalityIndexerPluginStart,
  HighCardinalityIndexerPluginSetupDependencies,
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
  public setup(
    core: CoreSetup<
      HighCardinalityIndexerPluginStartDependencies,
      HighCardinalityIndexerPluginStart
    >,
    plugins: HighCardinalityIndexerPluginSetupDependencies
  ): HighCardinalityIndexerPluginSetup {
    // plugins.features.registerKibanaFeature({
    //   id: OBSERVABILITY_AI_ASSISTANT_FEATURE_ID,
    //   name: i18n.translate('xpack.observabilityAiAssistant.featureRegistry.featureName', {
    //     defaultMessage: 'Observability AI Assistant',
    //   }),
    //   order: 8600,
    //   category: DEFAULT_APP_CATEGORIES.observability,
    //   app: [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID, 'kibana'],
    //   catalogue: [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID],
    //   minimumLicense: 'enterprise',
    //   // see x-pack/plugins/features/common/feature_kibana_privileges.ts
    //   privileges: {
    //     all: {
    //       app: [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID, 'kibana'],
    //       api: [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID, 'ai_assistant'],
    //       catalogue: [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID],
    //       savedObject: {
    //         all: [
    //           ACTION_SAVED_OBJECT_TYPE,
    //           ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
    //           CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
    //         ],
    //         read: [],
    //       },
    //       ui: ['show'],
    //     },
    //     read: {
    //       disabled: true,
    //       savedObject: {
    //         all: [],
    //         read: [],
    //       },
    //       ui: [],
    //     },
    //   },
    // });

    const routeHandlerPlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return pluginsStartContracts[
              key as keyof HighCardinalityIndexerPluginStartDependencies
            ];
          }),
      };
    }) as HighCardinalityIndexerRouteHandlerResources['plugins'];

    registerServerRoutes({
      core,
      logger: this.logger,
      dependencies: {
        plugins: routeHandlerPlugins,
      },
    });

    return {};
  }

  public start(
    core: CoreStart,
    plugins: HighCardinalityIndexerPluginStartDependencies
  ): HighCardinalityIndexerPluginStart {
    return {};
  }
}
