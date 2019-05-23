/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { DataSetup } from 'plugins/data';
import { I18nProvider } from '@kbn/i18n/react';
import { Datasource, Visualization, EditorFrameSetup, EditorFrameInstance } from '../types';

import { Datasource, Visualization, EditorFrameSetup, EditorFrameInstance } from '../types';
import { EditorFrame } from './editor_frame';

export interface EditorFrameSetupPlugins {
  data: DataSetup;
}

export class EditorFramePlugin {
  constructor() {}

  private datasources: Record<string, Datasource> = {};
  private visualizations: Record<string, Visualization> = {};

  private createInstance(): EditorFrameInstance {
    let domElement: Element;

    function unmount() {
      if (domElement) {
        unmountComponentAtNode(domElement);
      }
    }

    return {
      mount: element => {
        unmount();
        domElement = element;

        const firstDatasourceId = Object.keys(this.datasources)[0];
        const firstVisualizationId = Object.keys(this.visualizations)[0];

        render(
          <I18nProvider>
            <EditorFrame
              datasourceMap={this.datasources}
              visualizationMap={this.visualizations}
              initialDatasourceId={firstDatasourceId || null}
              initialVisualizationId={firstVisualizationId || null}
            />
          </I18nProvider>,
          domElement
        );
      },
      unmount,
    };
  }

  public setup(): EditorFrameSetup {
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

export const editorFrameSetup = () => editorFrame.setup();
export const editorFrameStop = () => editorFrame.stop();
