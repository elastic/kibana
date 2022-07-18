/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { ExpressionsSetup, ExpressionsStart } from '@kbn/expressions-plugin/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { Document } from '../persistence/saved_object_store';
import {
  Datasource,
  Visualization,
  EditorFrameSetup,
  EditorFrameInstance,
  EditorFrameStart,
} from '../types';

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
  private readonly datasources: Array<Datasource | (() => Promise<Datasource>)> = [];
  private readonly visualizations: Array<Visualization | (() => Promise<Visualization>)> = [];

  public loadDatasources = () => collectAsyncDefinitions(this.datasources);
  public loadVisualizations = () => collectAsyncDefinitions(this.visualizations);

  /**
   * This method takes a Lens saved object as returned from the persistence helper,
   * initializes datsources and visualization and creates the current expression.
   * This is an asynchronous process.
   * @param doc parsed Lens saved object
   */
  public documentToExpression = async (doc: Document) => {
    const [resolvedDatasources, resolvedVisualizations] = await Promise.all([
      this.loadDatasources(),
      this.loadVisualizations(),
    ]);

    const { persistedStateToExpression } = await import('../async_services');

    return await persistedStateToExpression(resolvedDatasources, resolvedVisualizations, doc);
  };

  public setup(): EditorFrameSetup {
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
        this.loadDatasources(),
        this.loadVisualizations(),
      ]);

      const { EditorFrame } = await import('../async_services');

      return {
        EditorFrameContainer: ({ showNoDataPopover, lensInspector }) => {
          return (
            <div className="lnsApp__frame">
              <EditorFrame
                data-test-subj="lnsEditorFrame"
                core={core}
                plugins={plugins}
                lensInspector={lensInspector}
                showNoDataPopover={showNoDataPopover}
                datasourceMap={resolvedDatasources}
                visualizationMap={resolvedVisualizations}
                ExpressionRenderer={plugins.expressions.ReactExpressionRenderer}
              />
            </div>
          );
        },
        datasourceMap: resolvedDatasources,
        visualizationMap: resolvedVisualizations,
      };
    };

    return {
      createInstance,
    };
  }
}
