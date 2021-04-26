/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, PluginInitializerContext, Plugin, Logger, CoreStart } from 'src/core/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { BfetchServerSetup } from 'src/plugins/bfetch/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { HomeServerPluginSetup } from 'src/plugins/home/server';
import { ReportingSetup } from '../../reporting/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { getCanvasFeature } from './feature';
import { initRoutes } from './routes';
import { registerCanvasUsageCollector } from './collectors';
import { loadSampleData } from './sample_data';
import { setupInterpreter } from './setup_interpreter';
import { customElementType, workpadType, workpadTemplateType } from './saved_objects';
import { initializeTemplates } from './templates';
import { getUISettings } from './ui_settings';

interface PluginsSetup {
  expressions: ExpressionsServerSetup;
  features: FeaturesPluginSetup;
  home: HomeServerPluginSetup;
  bfetch: BfetchServerSetup;
  reporting?: ReportingSetup;
  usageCollection?: UsageCollectionSetup;
}

export class CanvasPlugin implements Plugin {
  private readonly logger: Logger;
  constructor(public readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(coreSetup: CoreSetup, plugins: PluginsSetup) {
    coreSetup.uiSettings.register(getUISettings());
    coreSetup.savedObjects.registerType(customElementType);
    coreSetup.savedObjects.registerType(workpadType);
    coreSetup.savedObjects.registerType(workpadTemplateType);

    plugins.features.registerKibanaFeature(getCanvasFeature(plugins));

    const canvasRouter = coreSetup.http.createRouter();

    initRoutes({
      router: canvasRouter,
      expressions: plugins.expressions,
      bfetch: plugins.bfetch,
      elasticsearch: coreSetup.elasticsearch,
      logger: this.logger,
    });

    loadSampleData(
      plugins.home.sampleData.addSavedObjectsToSampleDataset,
      plugins.home.sampleData.addAppLinksToSampleDataset
    );

    // we need the kibana index provided by global config for the Canvas usage collector
    const globalConfig = this.initializerContext.config.legacy.get();
    registerCanvasUsageCollector(plugins.usageCollection, globalConfig.kibana.index);

    setupInterpreter(plugins.expressions);
  }

  public start(coreStart: CoreStart) {
    const client = coreStart.savedObjects.createInternalRepository();
    initializeTemplates(client);
  }

  public stop() {}
}
