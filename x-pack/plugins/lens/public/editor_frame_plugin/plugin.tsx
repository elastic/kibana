/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Datasource, Visualization, EditorFrameSetup } from '../types';

import { EditorFrame } from './editor_frame';

class EditorFramePlugin {
  constructor() {}

  private datasources: { [key: string]: Datasource } = {};
  private visualizations: { [key: string]: Visualization } = {};

  private element: Element | null = null;

  public setup(): EditorFrameSetup {
    return {
      render: domElement => {
        this.element = domElement;
        render(
          <EditorFrame datasources={this.datasources} visualizations={this.visualizations} />,
          domElement
        );
      },
      registerDatasource: (name, datasource) => {
        this.datasources[name] = datasource;
      },
      registerVisualization: (name, visualization) => {
        this.visualizations[name] = visualization;
      },
    };
  }

  public stop() {
    if (this.element) {
      unmountComponentAtNode(this.element);
    }
    return {};
  }
}

const editorFrame = new EditorFramePlugin();

export const editorFrameSetup = () => editorFrame.setup();
export const editorFrameStop = () => editorFrame.stop();
