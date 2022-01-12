/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart, PluginInitializerContext, Logger } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { PluginStart as DataViewsServerPluginStart } from 'src/plugins/data_views/server';
import { PluginStart as DataPluginStart } from 'src/plugins/data/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { FieldFormatsStart } from 'src/plugins/field_formats/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { setupRoutes } from './routes';
import { getUiSettings } from './ui_settings';
import {
  registerLensUsageCollector,
  initializeLensTelemetry,
  scheduleLensTelemetry,
} from './usage';
import { setupSavedObjects } from './saved_objects';
import { EmbeddableSetup } from '../../../../src/plugins/embeddable/server';
import { lensEmbeddableFactory } from './embeddable/lens_embeddable_factory';
import { setupExpressions } from './expressions';

export interface PluginSetupContract {
  usageCollection?: UsageCollectionSetup;
  taskManager?: TaskManagerSetupContract;
  embeddable: EmbeddableSetup;
  expressions: ExpressionsServerSetup;
}

export interface PluginStartContract {
  taskManager?: TaskManagerStartContract;
  fieldFormats: FieldFormatsStart;
  data: DataPluginStart;
  dataViews: DataViewsServerPluginStart;
}

export interface LensServerPluginSetup {
  lensEmbeddableFactory: typeof lensEmbeddableFactory;
}

export class LensServerPlugin implements Plugin<LensServerPluginSetup, {}, {}, {}> {
  private readonly telemetryLogger: Logger;

  constructor(private initializerContext: PluginInitializerContext) {
    this.telemetryLogger = initializerContext.logger.get('usage');
  }

  setup(core: CoreSetup<PluginStartContract>, plugins: PluginSetupContract) {
    setupSavedObjects(core);
    setupRoutes(core, this.initializerContext.logger.get());
    setupExpressions(core, plugins.expressions);
    core.uiSettings.register(getUiSettings());

    if (plugins.usageCollection && plugins.taskManager) {
      registerLensUsageCollector(
        plugins.usageCollection,
        core
          .getStartServices()
          .then(([_, { taskManager }]) => taskManager as TaskManagerStartContract)
      );
      initializeLensTelemetry(this.telemetryLogger, core, plugins.taskManager);
    }

    plugins.embeddable.registerEmbeddableFactory(lensEmbeddableFactory());
    return {
      lensEmbeddableFactory,
    };
  }

  start(core: CoreStart, plugins: PluginStartContract) {
    if (plugins.taskManager) {
      scheduleLensTelemetry(this.telemetryLogger, plugins.taskManager);
    }
    return {};
  }

  stop() {}
}
