/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, PluginInitializerContext, Plugin, Logger, CoreStart } from 'src/core/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from 'src/plugins/data/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { BfetchServerSetup } from 'src/plugins/bfetch/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { HomeServerPluginSetup } from 'src/plugins/home/server';
import { EmbeddableSetup } from 'src/plugins/embeddable/server';
import { ESSQL_SEARCH_STRATEGY } from '../common/lib/constants';
import { ReportingSetup } from '../../reporting/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { getCanvasFeature } from './feature';
import { initRoutes } from './routes';
import { registerCanvasUsageCollector } from './collectors';
import { loadSampleData } from './sample_data';
import { setupInterpreter } from './setup_interpreter';
import { customElementType, workpadTypeFactory, workpadTemplateType } from './saved_objects';
import type { CanvasSavedObjectTypeMigrationsDeps } from './saved_objects/migrations';
import { initializeTemplates } from './templates';
import { essqlSearchStrategyProvider } from './lib/essql_strategy';
import { getUISettings } from './ui_settings';
import { CanvasRouteHandlerContext, createWorkpadRouteContext } from './workpad_route_context';

interface PluginsSetup {
  expressions: ExpressionsServerSetup;
  embeddable: EmbeddableSetup;
  features: FeaturesPluginSetup;
  home: HomeServerPluginSetup;
  bfetch: BfetchServerSetup;
  data: DataPluginSetup;
  reporting?: ReportingSetup;
  usageCollection?: UsageCollectionSetup;
}

interface PluginsStart {
  data: DataPluginStart;
}

export class CanvasPlugin implements Plugin {
  private readonly logger: Logger;
  constructor(public readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(coreSetup: CoreSetup<PluginsStart>, plugins: PluginsSetup) {
    const expressionsFork = plugins.expressions.fork('canvas');
    const expressionsSetup = expressionsFork.setup();
    setupInterpreter(expressionsSetup, {
      embeddablePersistableStateService: {
        extract: plugins.embeddable.extract,
        inject: plugins.embeddable.inject,
        getAllMigrations: plugins.embeddable.getAllMigrations,
      },
    });

    const deps: CanvasSavedObjectTypeMigrationsDeps = { expressions: expressionsSetup };
    coreSetup.uiSettings.register(getUISettings());
    coreSetup.savedObjects.registerType(customElementType(deps));
    coreSetup.savedObjects.registerType(workpadTypeFactory(deps));
    coreSetup.savedObjects.registerType(workpadTemplateType(deps));

    plugins.features.registerKibanaFeature(getCanvasFeature(plugins));

    const expressionsStart = expressionsFork.start();
    const contextProvider = createWorkpadRouteContext({ expressions: expressionsStart });
    coreSetup.http.registerRouteHandlerContext<CanvasRouteHandlerContext, 'canvas'>(
      'canvas',
      contextProvider
    );

    const canvasRouter = coreSetup.http.createRouter<CanvasRouteHandlerContext>();

    initRoutes({
      router: canvasRouter,
      expressions: expressionsSetup,
      bfetch: plugins.bfetch,
      logger: this.logger,
    });

    loadSampleData(
      plugins.home.sampleData.addSavedObjectsToSampleDataset,
      plugins.home.sampleData.addAppLinksToSampleDataset
    );

    // we need the kibana index for the Canvas usage collector
    const kibanaIndex = coreSetup.savedObjects.getKibanaIndex();
    registerCanvasUsageCollector(plugins.usageCollection, kibanaIndex);

    coreSetup.getStartServices().then(([_, depsStart]) => {
      const strategy = essqlSearchStrategyProvider(depsStart.data);
      plugins.data.search.registerSearchStrategy(ESSQL_SEARCH_STRATEGY, strategy);
    });
  }

  public start(coreStart: CoreStart) {
    const client = coreStart.savedObjects.createInternalRepository();
    initializeTemplates(client);
  }

  public stop() {}
}
