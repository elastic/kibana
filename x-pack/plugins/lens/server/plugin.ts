/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Plugin,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  SavedObjectsClientContract,
  ElasticsearchClient,
  KibanaRequest,
} from '@kbn/core/server';
import {
  DataViewsServerPluginSetup,
  PluginStart as DataViewsServerPluginStart,
} from '@kbn/data-views-plugin/server';
import {
  PluginStart as DataPluginStart,
  PluginSetup as DataPluginSetup,
} from '@kbn/data-plugin/server';
import { ExpressionsServerSetup, ExpressionsServerStart } from '@kbn/expressions-plugin/server';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';

import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { DataViewPersistableStateService } from '@kbn/data-views-plugin/common';
import { SharePluginSetup } from '@kbn/share-plugin/server';
import type { EventAnnotationGroupSavedObjectAttributes } from '@kbn/event-annotation-plugin/common';
import { mapSavedObjectToGroupConfig } from '@kbn/event-annotation-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { lastValueFrom } from 'rxjs';
import { setupSavedObjects } from './saved_objects';
import { setupExpressions } from './expressions';
import { makeLensEmbeddableFactory } from './embeddable/make_lens_embeddable_factory';
import type { CustomVisualizationMigrations } from './migrations/types';
import { LensAppLocatorDefinition } from '../common/locator/locator';
import { CONTENT_ID, LATEST_VERSION } from '../common/content_management';
import { LensStorage } from './content_management';
import type { Document } from '../public/persistence';
import type { DatasourceCommonMap } from '../common/types';
import { initializeDataViews } from '../common/state_helpers';
import {
  initializeDatasources,
  initializeEventAnnotationGroups,
} from '../common/doc_to_expression';
import { getDatasourceExpressionsByLayers } from '../common/expression_helpers';
import { TextBasedDatasourceCommon } from '../common/datasources/text_based/text_based_languages';
import { getCommonFormBasedDatasource } from '../common/datasources/form_based/form_based';

export interface PluginSetupContract {
  taskManager?: TaskManagerSetupContract;
  embeddable: EmbeddableSetup;
  expressions: ExpressionsServerSetup;
  data: DataPluginSetup;
  share?: SharePluginSetup;
  contentManagement: ContentManagementServerSetup;
  dataViews: DataViewsServerPluginSetup;
}

export interface PluginStartContract {
  taskManager?: TaskManagerStartContract;
  fieldFormats: FieldFormatsStart;
  data: DataPluginStart;
  dataViews: DataViewsServerPluginStart;
  expressions: ExpressionsServerStart;
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
  /**
   * Converts a Lens document to an expression
   */
  extractQueries: (
    doc: Document,
    clients: { savedObjects: SavedObjectsClientContract; elasticsearch: ElasticsearchClient },
    request: KibanaRequest
  ) => Promise<object[]>;
}

export class LensServerPlugin implements Plugin<LensServerPluginSetup, {}, {}, {}> {
  private customVisualizationMigrations: CustomVisualizationMigrations = {};

  constructor(private initializerContext: PluginInitializerContext) {}

  setup(core: CoreSetup<PluginStartContract>, plugins: PluginSetupContract) {
    const getFilterMigrations = plugins.data.query.filterManager.getAllMigrations.bind(
      plugins.data.query.filterManager
    );
    setupSavedObjects(core, getFilterMigrations, this.customVisualizationMigrations);
    setupExpressions(core, plugins.expressions);

    if (plugins.share) {
      plugins.share.url.locators.create(new LensAppLocatorDefinition());
    }

    plugins.contentManagement.register({
      id: CONTENT_ID,
      storage: new LensStorage({
        throwOnResultValidationError: this.initializerContext.env.mode.dev,
        logger: this.initializerContext.logger.get('storage'),
      }),
      version: {
        latest: LATEST_VERSION,
      },
    });

    const lensEmbeddableFactory = makeLensEmbeddableFactory(
      getFilterMigrations,
      DataViewPersistableStateService.getAllMigrations.bind(DataViewPersistableStateService),
      this.customVisualizationMigrations
    );
    plugins.embeddable.registerEmbeddableFactory(lensEmbeddableFactory());

    const extractQueries = async (
      doc: Document,
      clients: { savedObjects: SavedObjectsClientContract; elasticsearch: ElasticsearchClient },
      request: KibanaRequest
    ) => {
      const [, { dataViews, expressions }] = await core.getStartServices();

      const dataViewsService = await dataViews.dataViewsServiceFactory(
        clients.savedObjects,
        clients.elasticsearch
      );

      const loadAnnotationGroup = async (id: string) => {
        const savedObject =
          await clients.savedObjects.get<EventAnnotationGroupSavedObjectAttributes>(
            'annotation',
            id
          );
        return mapSavedObjectToGroupConfig(savedObject);
      };

      const {
        state: { datasourceStates: persistedDatasourceStates, adHocDataViews, internalReferences },
        references,
      } = doc;

      const annotationGroups = await initializeEventAnnotationGroups(
        loadAnnotationGroup,
        references
      );

      const datasources = [TextBasedDatasourceCommon, getCommonFormBasedDatasource({})];

      const datasourceMap: DatasourceCommonMap = {};

      datasources.forEach((datasource) => {
        datasourceMap[datasource.id] = datasource;
      });

      const datasourceStatesFromSO = Object.fromEntries(
        Object.entries(persistedDatasourceStates).map(([id, state]) => [
          id,
          { isLoading: false, state },
        ])
      );

      const { indexPatterns, indexPatternRefs } = await initializeDataViews(
        {
          datasourceMap,
          datasourceStates: datasourceStatesFromSO,
          references,
          dataViews: dataViewsService,
          defaultIndexPatternId: '',
          adHocDataViews,
          annotationGroups,
        },
        { isFullEditor: false }
      );

      const datasourceStates = initializeDatasources({
        datasourceMap,
        datasourceStates: datasourceStatesFromSO,
        references: [...references, ...(internalReferences || [])],
        indexPatterns,
        indexPatternRefs,
      });

      const datasourceExpressionsByLayers = getDatasourceExpressionsByLayers(
        datasourceMap,
        datasourceStates,
        indexPatterns,
        { fromDate: '', toDate: '' },
        new Date()
      );

      if (!datasourceExpressionsByLayers) {
        return [];
      }

      const requestAdapter = new RequestAdapter();

      const asts = Object.values(datasourceExpressionsByLayers);

      const observables = asts.map((ast) =>
        expressions.run(ast, undefined, {
          kibanaRequest: request,
          inspectorAdapters: {
            requests: requestAdapter,
          },
        })
      );

      const requests: Array<object | undefined> = [];

      observables.map((obs) =>
        obs.subscribe(() => {
          requests.push(...requestAdapter.getRequests().map(({ json }) => json));
        })
      );

      const promises = observables.map((obs) => lastValueFrom(obs));

      await Promise.all(promises);

      return requests.filter(Boolean) as object[];
    };

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
      extractQueries,
    };
  }

  start(_core: CoreStart, _plugins: PluginStartContract) {
    return {};
  }

  stop() {}
}
