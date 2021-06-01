/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreSetup, CoreStart } from 'kibana/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { ExpressionsSetup, ExpressionsStart } from '../../../../../src/plugins/expressions/public';
import { EmbeddableSetup, EmbeddableStart } from '../../../../../src/plugins/embeddable/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../src/plugins/data/public';
import {
  Datasource,
  Visualization,
  EditorFrameSetup,
  EditorFrameInstance,
  EditorFrameStart,
} from '../types';
import { Document } from '../persistence/saved_object_store';
import { mergeTables } from './merge_tables';
import { EmbeddableFactory, LensEmbeddableStartServices } from './embeddable/embeddable_factory';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import { DashboardStart } from '../../../../../src/plugins/dashboard/public';
import { LensAttributeService } from '../lens_attribute_service';

export interface EditorFrameSetupPlugins {
  data: DataPublicPluginSetup;
  embeddable?: EmbeddableSetup;
  expressions: ExpressionsSetup;
  charts: ChartsPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface EditorFrameStartPlugins {
  data: DataPublicPluginStart;
  embeddable?: EmbeddableStart;
  dashboard?: DashboardStart;
  expressions: ExpressionsStart;
  uiActions: UiActionsStart;
  charts: ChartsPluginSetup;
}

async function collectAsyncDefinitions<T extends { id: string }>(
  definitions: Array<T | (() => Promise<T>)>
) {
  const resolvedDefinitions = await Promise.all(
    definitions.map((definition) => (typeof definition === 'function' ? definition() : definition))
  );
  const definitionMap: Record<string, T> = {};
  resolvedDefinitions.forEach((definition) => {
    definitionMap[definition.id] = definition;
  });

  return definitionMap;
}

export class EditorFrameService {
  constructor() {}

  private readonly datasources: Array<Datasource | (() => Promise<Datasource>)> = [];
  private readonly visualizations: Array<Visualization | (() => Promise<Visualization>)> = [];

  /**
   * This method takes a Lens saved object as returned from the persistence helper,
   * initializes datsources and visualization and creates the current expression.
   * This is an asynchronous process and should only be triggered once for a saved object.
   * @param doc parsed Lens saved object
   */
  private documentToExpression = async (doc: Document) => {
    const [resolvedDatasources, resolvedVisualizations] = await Promise.all([
      collectAsyncDefinitions(this.datasources),
      collectAsyncDefinitions(this.visualizations),
    ]);

    const { persistedStateToExpression } = await import('../async_services');

    return await persistedStateToExpression(resolvedDatasources, resolvedVisualizations, doc);
  };

  public setup(
    core: CoreSetup<EditorFrameStartPlugins>,
    plugins: EditorFrameSetupPlugins,
    getAttributeService: () => Promise<LensAttributeService>
  ): EditorFrameSetup {
    plugins.expressions.registerFunction(() => mergeTables);

    const getStartServices = async (): Promise<LensEmbeddableStartServices> => {
      const [coreStart, deps] = await core.getStartServices();
      return {
        attributeService: await getAttributeService(),
        capabilities: coreStart.application.capabilities,
        coreHttp: coreStart.http,
        timefilter: deps.data.query.timefilter.timefilter,
        expressionRenderer: deps.expressions.ReactExpressionRenderer,
        documentToExpression: this.documentToExpression,
        indexPatternService: deps.data.indexPatterns,
        uiActions: deps.uiActions,
        usageCollection: plugins.usageCollection,
      };
    };

    if (plugins.embeddable) {
      plugins.embeddable.registerEmbeddableFactory('lens', new EmbeddableFactory(getStartServices));
    }

    return {
      registerDatasource: (datasource) => {
        this.datasources.push(datasource as Datasource<unknown, unknown>);
      },
      registerVisualization: (visualization) => {
        this.visualizations.push(visualization as Visualization<unknown>);
      },
    };
  }

  public start(core: CoreStart, plugins: EditorFrameStartPlugins): EditorFrameStart {
    const createInstance = async (): Promise<EditorFrameInstance> => {
      const [resolvedDatasources, resolvedVisualizations] = await Promise.all([
        collectAsyncDefinitions(this.datasources),
        collectAsyncDefinitions(this.visualizations),
      ]);

      const { EditorFrame } = await import('../async_services');
      const palettes = await plugins.charts.palettes.getPalettes();

      return {
        EditorFrameContainer: ({ onError, showNoDataPopover, initialContext }) => {
          return (
            <div className="lnsApp__frame">
              <EditorFrame
                data-test-subj="lnsEditorFrame"
                onError={onError}
                datasourceMap={resolvedDatasources}
                visualizationMap={resolvedVisualizations}
                core={core}
                plugins={plugins}
                ExpressionRenderer={plugins.expressions.ReactExpressionRenderer}
                palettes={palettes}
                showNoDataPopover={showNoDataPopover}
                initialContext={initialContext}
              />
            </div>
          );
        },
      };
    };

    return {
      createInstance,
    };
  }
}
