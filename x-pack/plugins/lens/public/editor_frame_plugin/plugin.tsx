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
        // casting it to an unknown datasource. This doesn't introduce runtime errors
        // because each type T is always also an unknown, but typescript won't do it
        // on it's own because we are loosing type information here.
        // So it's basically explicitly saying "I'm dropping the information about type T here
        // because this information isn't useful to me." but without using any which can leak
        this.datasources[name] = datasource as Datasource<unknown, unknown>;
      },
      registerVisualization: (name, visualization) => {
        this.visualizations[name] = visualization as Visualization<unknown, unknown>;
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
