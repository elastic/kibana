/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import { PluginStart as DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import {
  PluginStart as DataPluginStart,
  PluginSetup as DataPluginSetup,
} from '@kbn/data-plugin/server';
import { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';

import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { DataViewPersistableStateService } from '@kbn/data-views-plugin/common';
import { SharePluginSetup } from '@kbn/share-plugin/server';
import { setupSavedObjects } from './saved_objects';
import { setupExpressions } from './expressions';
import { makeLensEmbeddableFactory } from './embeddable/make_lens_embeddable_factory';
import type { CustomVisualizationMigrations } from './migrations/types';
import { LensAppLocatorDefinition } from '../common/locator/locator';

export interface PluginSetupContract {
  taskManager?: TaskManagerSetupContract;
  embeddable: EmbeddableSetup;
  expressions: ExpressionsServerSetup;
  data: DataPluginSetup;
  share?: SharePluginSetup;
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
  private customVisualizationMigrations: CustomVisualizationMigrations = {};

  constructor() {}

  setup(core: CoreSetup<PluginStartContract>, plugins: PluginSetupContract) {
    const getFilterMigrations = plugins.data.query.filterManager.getAllMigrations.bind(
      plugins.data.query.filterManager
    );
    setupSavedObjects(core, getFilterMigrations, this.customVisualizationMigrations);
    setupExpressions(core, plugins.expressions);

    if (plugins.share) {
      plugins.share.url.locators.create(new LensAppLocatorDefinition());
    }

    const lensEmbeddableFactory = makeLensEmbeddableFactory(
      getFilterMigrations,
      DataViewPersistableStateService.getAllMigrations.bind(DataViewPersistableStateService),
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
    return {};
  }

  stop() {}
}
