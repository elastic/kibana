/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreSetup } from 'src/core/public';
import { HashRouter, Switch, Route, RouteComponentProps } from 'react-router-dom';
import chrome from 'ui/chrome';
import { DataSetup, ExpressionRenderer } from '../../../../../src/legacy/core_plugins/data/public';
import { data } from '../../../../../src/legacy/core_plugins/data/public/setup';
import { Datasource, Visualization, EditorFrameSetup, EditorFrameInstance } from '../types';
import { EditorFrame } from './editor_frame';
import { LensSavedObjectStore } from '../persistence/lens_store';
import { InitializableComponent } from './initializable_component';

export interface EditorFrameSetupPlugins {
  data: DataSetup;
}

export class EditorFramePlugin {
  constructor() {}
  private ExpressionRenderer: ExpressionRenderer | null = null;

  private readonly datasources: Record<string, Datasource> = {};
  private readonly visualizations: Record<string, Visualization> = {};

  private createInstance(): EditorFrameInstance {
    let domElement: Element;

    const store = new LensSavedObjectStore(chrome.getSavedObjectsClient());

    function unmount() {
      if (domElement) {
        unmountComponentAtNode(domElement);
      }
    }

    return {
      mount: element => {
        domElement = element;

        const renderEditor = (routeProps: RouteComponentProps<{ id?: string }>) => {
          const firstDatasourceId = Object.keys(this.datasources)[0];
          const firstVisualizationId = Object.keys(this.visualizations)[0];
          const persistedId = routeProps.match.params.id;

          return (
            <I18nProvider>
              <InitializableComponent
                watch={[persistedId]}
                init={async () => {
                  if (!persistedId) {
                    return { doc: undefined };
                  } else {
                    return store.load(persistedId).then(doc => ({ doc }));
                  }
                }}
                render={({ doc }) => {
                  if (!this.ExpressionRenderer) {
                    return null;
                  }

                  return (
                    <EditorFrame
                      store={store}
                      datasourceMap={this.datasources}
                      visualizationMap={this.visualizations}
                      initialDatasourceId={firstDatasourceId || null}
                      initialVisualizationId={firstVisualizationId || null}
                      ExpressionRenderer={this.ExpressionRenderer}
                      redirectTo={path => routeProps.history.push(path)}
                      doc={doc}
                    />
                  );
                }}
              />
            </I18nProvider>
          );
        };

        render(
          <HashRouter>
            <Switch>
              <Route exact path="/edit/:id" render={renderEditor} />
              <Route exact path="/" render={renderEditor} />
              <Route component={NotFound} />
            </Switch>
          </HashRouter>,
          domElement
        );
      },
      unmount,
    };
  }

  public setup(_core: CoreSetup | null, plugins: EditorFrameSetupPlugins): EditorFrameSetup {
    this.ExpressionRenderer = plugins.data.expressions.ExpressionRenderer;
    return {
      createInstance: this.createInstance.bind(this),
      registerDatasource: (name, datasource) => {
        this.datasources[name] = datasource as Datasource<unknown, unknown>;
      },
      registerVisualization: (name, visualization) => {
        this.visualizations[name] = visualization as Visualization<unknown, unknown>;
      },
    };
  }

  public stop() {
    return {};
  }
}

const editorFrame = new EditorFramePlugin();

export const editorFrameSetup = () =>
  editorFrame.setup(null, {
    data,
  });

export const editorFrameStop = () => editorFrame.stop();

function NotFound() {
  return <h1>TODO: 404 Page</h1>;
}
