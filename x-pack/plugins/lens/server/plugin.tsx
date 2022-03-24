/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart, PluginInitializerContext, Logger } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { PluginStart as DataViewsServerPluginStart } from 'src/plugins/data_views/server';
import {
  PluginStart as DataPluginStart,
  PluginSetup as DataPluginSetup,
} from 'src/plugins/data/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { FieldFormatsStart } from 'src/plugins/field_formats/server';
import type { MigrateFunctionsObject } from 'src/plugins/kibana_utils/common';

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
import { setupExpressions } from './expressions';
import { makeLensEmbeddableFactory } from './embeddable/make_lens_embeddable_factory';
import type { CustomVisualizationMigrations } from './migrations/types';

export interface PluginSetupContract {
  usageCollection?: UsageCollectionSetup;
  taskManager?: TaskManagerSetupContract;
  embeddable: EmbeddableSetup;
  expressions: ExpressionsServerSetup;
  data: DataPluginSetup;
}

export interface PluginStartContract {
  taskManager?: TaskManagerStartContract;
  fieldFormats: FieldFormatsStart;
  data: DataPluginStart;
  dataViews: DataViewsServerPluginStart;
}

export interface LensServerPluginSetup {
  /**
   * Server side embeddable definition which provides migrations to run if Lens state is embedded into another saved object somewhere
   */
  lensEmbeddableFactory: ReturnType<typeof makeLensEmbeddableFactory>;
  /**
   * Register custom migration functions for custom third party Lens visualizations
   */
  registerVisualizationMigration: (
    id: string,
    migrationsGetter: () => MigrateFunctionsObject
  ) => void;
}

export class LensServerPlugin implements Plugin<LensServerPluginSetup, {}, {}, {}> {
  private readonly telemetryLogger: Logger;
  private customVisualizationMigrations: CustomVisualizationMigrations = {};

  constructor(private initializerContext: PluginInitializerContext) {
    this.telemetryLogger = initializerContext.logger.get('usage');
  }

  setup(core: CoreSetup<PluginStartContract>, plugins: PluginSetupContract) {
    const getFilterMigrations = plugins.data.query.filterManager.getAllMigrations.bind(
      plugins.data.query.filterManager
    );
    setupSavedObjects(core, getFilterMigrations, this.customVisualizationMigrations);
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

    const lensEmbeddableFactory = makeLensEmbeddableFactory(
      getFilterMigrations,
      this.customVisualizationMigrations
    );
    plugins.embeddable.registerEmbeddableFactory(lensEmbeddableFactory());
    return {
      lensEmbeddableFactory,
      registerVisualizationMigration: (
        id: string,
        migrationsGetter: () => MigrateFunctionsObject
      ) => {
        if (this.customVisualizationMigrations[id]) {
          throw new Error(`Migrations object for visualization ${id} registered already`);
        }
        this.customVisualizationMigrations[id] = migrationsGetter;
      },
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
