/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreSetup, CoreStart } from 'kibana/public';
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
import { EditorFrame } from './editor_frame';
import { mergeTables } from './merge_tables';
import { formatColumn } from './format_column';
import { EmbeddableFactory } from './embeddable/embeddable_factory';
import { getActiveDatasourceIdFromDoc } from './editor_frame/state_management';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';

export interface EditorFrameSetupPlugins {
  data: DataPublicPluginSetup;
  embeddable?: EmbeddableSetup;
  expressions: ExpressionsSetup;
}

export interface EditorFrameStartPlugins {
  data: DataPublicPluginStart;
  embeddable?: EmbeddableStart;
  expressions: ExpressionsStart;
  uiActions?: UiActionsStart;
}

async function collectAsyncDefinitions<T extends { id: string }>(
  definitions: Array<T | Promise<T>>
) {
  const resolvedDefinitions = await Promise.all(definitions);
  const definitionMap: Record<string, T> = {};
  resolvedDefinitions.forEach((definition) => {
    definitionMap[definition.id] = definition;
  });

  return definitionMap;
}

export class EditorFrameService {
  constructor() {}

  private readonly datasources: Array<Datasource | Promise<Datasource>> = [];
  private readonly visualizations: Array<Visualization | Promise<Visualization>> = [];

  public setup(
    core: CoreSetup<EditorFrameStartPlugins>,
    plugins: EditorFrameSetupPlugins
  ): EditorFrameSetup {
    plugins.expressions.registerFunction(() => mergeTables);
    plugins.expressions.registerFunction(() => formatColumn);

    const getStartServices = async () => {
      const [coreStart, deps] = await core.getStartServices();
      return {
        capabilities: coreStart.application.capabilities,
        savedObjectsClient: coreStart.savedObjects.client,
        coreHttp: coreStart.http,
        timefilter: deps.data.query.timefilter.timefilter,
        expressionRenderer: deps.expressions.ReactExpressionRenderer,
        indexPatternService: deps.data.indexPatterns,
        uiActions: deps.uiActions,
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
        this.visualizations.push(visualization as Visualization<unknown, unknown>);
      },
    };
  }

  public start(core: CoreStart, plugins: EditorFrameStartPlugins): EditorFrameStart {
    const createInstance = async (): Promise<EditorFrameInstance> => {
      let domElement: Element;
      const [resolvedDatasources, resolvedVisualizations] = await Promise.all([
        collectAsyncDefinitions(this.datasources),
        collectAsyncDefinitions(this.visualizations),
      ]);

      return {
        mount: (
          element,
          { doc, onError, dateRange, query, filters, savedQuery, onChange, showNoDataPopover }
        ) => {
          domElement = element;
          const firstDatasourceId = Object.keys(resolvedDatasources)[0];
          const firstVisualizationId = Object.keys(resolvedVisualizations)[0];

          render(
            <I18nProvider>
              <EditorFrame
                data-test-subj="lnsEditorFrame"
                onError={onError}
                datasourceMap={resolvedDatasources}
                visualizationMap={resolvedVisualizations}
                initialDatasourceId={getActiveDatasourceIdFromDoc(doc) || firstDatasourceId || null}
                initialVisualizationId={
                  (doc && doc.visualizationType) || firstVisualizationId || null
                }
                core={core}
                plugins={plugins}
                ExpressionRenderer={plugins.expressions.ReactExpressionRenderer}
                doc={doc}
                dateRange={dateRange}
                query={query}
                filters={filters}
                savedQuery={savedQuery}
                onChange={onChange}
                showNoDataPopover={showNoDataPopover}
              />
            </I18nProvider>,
            domElement
          );
        },
        unmount() {
          if (domElement) {
            unmountComponentAtNode(domElement);
          }
        },
      };
    };

    return {
      createInstance,
    };
  }
}
