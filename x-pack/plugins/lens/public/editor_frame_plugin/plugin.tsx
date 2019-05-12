/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Datasource, Visualization, EditorFrameSetup } from '../types';

import { EditorFrame } from './editor_frame';

export class EditorFramePlugin {
  constructor() {}

  private datasources: Record<string, Datasource> = {};
  private visualizations: Record<string, Visualization> = {};

  public setup(): EditorFrameSetup {
    return {
      createInstance: () => {
        let domElement: Element;
        return {
          mount: (element: Element) => {
            if (domElement) {
              unmountComponentAtNode(domElement);
            }
            domElement = element;
            render(
              <EditorFrame
                datasources={this.datasources}
                visualizations={this.visualizations}
                initialDatasource={Object.keys(this.datasources)[0]}
                initialVisualization={Object.keys(this.visualizations)[0]}
              />,
              domElement
            );
          },
          unmount: () => {
            if (domElement) {
              unmountComponentAtNode(domElement);
            }
          },
        };
      },
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
